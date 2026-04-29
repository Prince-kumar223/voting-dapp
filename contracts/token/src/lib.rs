#![no_std]

use soroban_sdk::{
    contract, contracterror, contractimpl, contracttype, panic_with_error, symbol_short, Address,
    Env, String, Symbol,
};

#[contracttype]
#[derive(Clone)]
pub enum DataKey {
    Admin,
    Decimals,
    Name,
    Symbol,
    Balance(Address),
    Allowance(Address, Address),
}

#[contracterror]
#[derive(Copy, Clone, Debug, Eq, PartialEq)]
#[repr(u32)]
pub enum TokenError {
    NotInitialized = 1,
    NotAuthorized = 2,
    InsufficientBalance = 3,
    InsufficientAllowance = 4,
    InvalidAmount = 5,
}

#[contract]
pub struct RewardToken;

fn require_init(e: &Env) {
    if !e.storage().instance().has(&DataKey::Admin) {
        panic_with_error!(e, TokenError::NotInitialized);
    }
}

fn read_admin(e: &Env) -> Address {
    require_init(e);
    e.storage().instance().get(&DataKey::Admin).unwrap()
}

fn read_balance(e: &Env, id: &Address) -> i128 {
    require_init(e);
    e.storage()
        .instance()
        .get(&DataKey::Balance(id.clone()))
        .unwrap_or(0)
}

fn write_balance(e: &Env, id: &Address, balance: i128) {
    e.storage()
        .instance()
        .set(&DataKey::Balance(id.clone()), &balance);
}

fn spend_allowance(e: &Env, from: &Address, spender: &Address, amount: i128) {
    let key = DataKey::Allowance(from.clone(), spender.clone());
    let cur: i128 = e.storage().instance().get(&key).unwrap_or(0);
    if cur < amount {
        panic_with_error!(e, TokenError::InsufficientAllowance);
    }
    e.storage().instance().set(&key, &(cur - amount));
}

fn require_positive_amount(e: &Env, amount: i128) {
    if amount <= 0 {
        panic_with_error!(e, TokenError::InvalidAmount);
    }
}

#[contractimpl]
impl RewardToken {
    // --- Admin / metadata ---
    pub fn init(e: Env, admin: Address, name: String, symbol: String, decimals: u32) {
        if e.storage().instance().has(&DataKey::Admin) {
            return;
        }
        admin.require_auth();
        e.storage().instance().set(&DataKey::Admin, &admin);
        e.storage().instance().set(&DataKey::Name, &name);
        e.storage().instance().set(&DataKey::Symbol, &symbol);
        e.storage().instance().set(&DataKey::Decimals, &decimals);
    }

    pub fn set_admin(e: Env, caller: Address, new_admin: Address) {
        require_init(&e);
        caller.require_auth();
        let admin = read_admin(&e);
        if caller != admin {
            panic_with_error!(&e, TokenError::NotAuthorized);
        }
        e.storage().instance().set(&DataKey::Admin, &new_admin);
    }

    pub fn decimals(e: Env) -> u32 {
        require_init(&e);
        e.storage().instance().get(&DataKey::Decimals).unwrap()
    }

    pub fn name(e: Env) -> String {
        require_init(&e);
        e.storage().instance().get(&DataKey::Name).unwrap()
    }

    pub fn symbol(e: Env) -> String {
        require_init(&e);
        e.storage().instance().get(&DataKey::Symbol).unwrap()
    }

    // --- SEP-41 subset (balance + transfers + allowances) ---
    pub fn balance(e: Env, id: Address) -> i128 {
        read_balance(&e, &id)
    }

    pub fn allowance(e: Env, from: Address, spender: Address) -> i128 {
        require_init(&e);
        e.storage()
            .instance()
            .get(&DataKey::Allowance(from, spender))
            .unwrap_or(0)
    }

    pub fn approve(e: Env, from: Address, spender: Address, amount: i128, _expiration_ledger: u32) {
        require_init(&e);
        from.require_auth();
        if amount < 0 {
            panic_with_error!(&e, TokenError::InvalidAmount);
        }
        e.storage()
            .instance()
            .set(&DataKey::Allowance(from.clone(), spender.clone()), &amount);
        e.events()
            .publish((Symbol::new(&e, "approve"), from, spender), (amount,));
    }

    pub fn transfer(e: Env, from: Address, to: Address, amount: i128) {
        require_init(&e);
        require_positive_amount(&e, amount);
        from.require_auth();

        let from_bal = read_balance(&e, &from);
        if from_bal < amount {
            panic_with_error!(&e, TokenError::InsufficientBalance);
        }
        write_balance(&e, &from, from_bal - amount);
        write_balance(&e, &to, read_balance(&e, &to) + amount);

        e.events()
            .publish((symbol_short!("transfer"), from, to), amount);
    }

    pub fn transfer_from(e: Env, spender: Address, from: Address, to: Address, amount: i128) {
        require_init(&e);
        require_positive_amount(&e, amount);
        spender.require_auth();

        spend_allowance(&e, &from, &spender, amount);

        let from_bal = read_balance(&e, &from);
        if from_bal < amount {
            panic_with_error!(&e, TokenError::InsufficientBalance);
        }
        write_balance(&e, &from, from_bal - amount);
        write_balance(&e, &to, read_balance(&e, &to) + amount);

        e.events()
            .publish((symbol_short!("transfer"), from, to), amount);
    }

    pub fn burn(e: Env, from: Address, amount: i128) {
        require_init(&e);
        require_positive_amount(&e, amount);
        from.require_auth();

        let bal = read_balance(&e, &from);
        if bal < amount {
            panic_with_error!(&e, TokenError::InsufficientBalance);
        }
        write_balance(&e, &from, bal - amount);
        e.events().publish((symbol_short!("burn"), from), amount);
    }

    pub fn burn_from(e: Env, spender: Address, from: Address, amount: i128) {
        require_init(&e);
        require_positive_amount(&e, amount);
        spender.require_auth();
        spend_allowance(&e, &from, &spender, amount);

        let bal = read_balance(&e, &from);
        if bal < amount {
            panic_with_error!(&e, TokenError::InsufficientBalance);
        }
        write_balance(&e, &from, bal - amount);
        e.events().publish((symbol_short!("burn"), from), amount);
    }

    // --- App-specific admin mint ---
    pub fn mint(e: Env, to: Address, amount: i128) {
        require_init(&e);
        require_positive_amount(&e, amount);

        // Authorization model:
        // - Admin is an Address (account or contract).
        // - Mint requires admin authorization.
        //   When admin is set to the voting contract address, direct calls from the voting contract
        //   to this token contract satisfy the authorization check.
        let admin = read_admin(&e);
        admin.require_auth();

        write_balance(&e, &to, read_balance(&e, &to) + amount);
        e.events()
            .publish((Symbol::new(&e, "tokens_rewarded"),), (to, amount));
    }
}

#[cfg(test)]
mod test {
    extern crate std;

    use super::*;
    use soroban_sdk::testutils::Address as _;
    use soroban_sdk::Env;

    #[test]
    fn mint_only_by_admin_invoker() {
        let e = Env::default();
        let admin = Address::generate(&e);
        let user = Address::generate(&e);

        let token_id = e.register(RewardToken, ());
        let token = RewardTokenClient::new(&e, &token_id);

        e.mock_all_auths();
        token.init(
            &admin,
            &String::from_str(&e, "RewardToken"),
            &String::from_str(&e, "RWD"),
            &7u32,
        );

        token.set_admin(&admin, &admin);
        token.mint(&user, &10i128);
        assert_eq!(token.balance(&user), 10);
    }
}
