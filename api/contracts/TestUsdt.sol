// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * A stand-in for Tether USD on BSC testnet.
 *
 * There is no official Tether contract on testnet (docs/DEPENDENCIES.md
 * §2.4), so the deposit watcher needs something to watch. This is a plain
 * BEP-20 with the same shape as BSC-USD on mainnet — 18 decimals, the same
 * Transfer and Approval events — so nothing above the chain seam can tell
 * the difference.
 *
 * Deliberately minimal. It is not an upgrade target, it has no pause, no
 * blacklist and no fee-on-transfer: a test token that behaves differently
 * from the real one would hide the bugs it exists to find.
 */
contract TestUsdt {
    string public constant name = "Tether USD (FundFusion test)";
    string public constant symbol = "USDT";
    uint8 public constant decimals = 18;

    uint256 public totalSupply;
    address public owner;

    mapping(address => uint256) public balanceOf;
    mapping(address => mapping(address => uint256)) public allowance;

    event Transfer(address indexed from, address indexed to, uint256 value);
    event Approval(address indexed owner, address indexed spender, uint256 value);

    error NotOwner();
    error InsufficientBalance();
    error InsufficientAllowance();
    error ZeroAddress();

    constructor(uint256 initialSupply) {
        owner = msg.sender;
        _mint(msg.sender, initialSupply);
    }

    /**
     * Faucet. Restricted to the deployer so a test environment cannot be
     * flooded by anyone who finds the address, but open enough that topping
     * up a test account is one call.
     */
    function mint(address to, uint256 value) external {
        if (msg.sender != owner) revert NotOwner();
        _mint(to, value);
    }

    function transfer(address to, uint256 value) external returns (bool) {
        _transfer(msg.sender, to, value);
        return true;
    }

    function approve(address spender, uint256 value) external returns (bool) {
        allowance[msg.sender][spender] = value;
        emit Approval(msg.sender, spender, value);
        return true;
    }

    function transferFrom(address from, address to, uint256 value) external returns (bool) {
        uint256 allowed = allowance[from][msg.sender];
        if (allowed != type(uint256).max) {
            if (allowed < value) revert InsufficientAllowance();
            allowance[from][msg.sender] = allowed - value;
        }
        _transfer(from, to, value);
        return true;
    }

    function _transfer(address from, address to, uint256 value) private {
        if (to == address(0)) revert ZeroAddress();
        uint256 held = balanceOf[from];
        if (held < value) revert InsufficientBalance();
        unchecked {
            balanceOf[from] = held - value;
            balanceOf[to] += value;
        }
        emit Transfer(from, to, value);
    }

    function _mint(address to, uint256 value) private {
        if (to == address(0)) revert ZeroAddress();
        totalSupply += value;
        unchecked {
            balanceOf[to] += value;
        }
        emit Transfer(address(0), to, value);
    }
}
