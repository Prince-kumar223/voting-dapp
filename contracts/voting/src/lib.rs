#![no_std]

use soroban_sdk::{
    contract, contracterror, contractimpl, contracttype, panic_with_error, symbol_short, Address,
    Env, String, Symbol, Vec,
};

#[contracttype]
#[derive(Clone)]
pub struct Proposal {
    pub id: u32,
    pub title: String,
    pub votes: u32,
}

#[contracttype]
#[derive(Clone)]
pub enum DataKey {
    Admin,
    TokenContractId,
    RewardAmount,
    ProposalIds,
    Proposal(u32),
    HasVoted(u32, Address),
}

mod mint_token {
    use soroban_sdk::{contractclient, Address, Env};

    // Minimal interface used by the voting contract.
    // The token contract we deploy will implement SEP-41 + this admin mint.
    #[contractclient(name = "MintTokenClient")]
    pub trait MintToken {
        fn mint(env: Env, to: Address, amount: i128);
    }
}

#[contracterror]
#[derive(Copy, Clone, Debug, Eq, PartialEq)]
#[repr(u32)]
pub enum VotingError {
    NotInitialized = 1,
    AlreadyVoted = 2,
    ProposalNotFound = 3,
    NotAuthorized = 4,
}

#[contract]
pub struct VotingContract;

fn require_init(e: &Env) {
    if !e.storage().instance().has(&DataKey::Admin) {
        panic_with_error!(e, VotingError::NotInitialized);
    }
}

fn read_admin(e: &Env) -> Address {
    require_init(e);
    e.storage().instance().get(&DataKey::Admin).unwrap()
}

fn read_token_contract_id(e: &Env) -> Address {
    require_init(e);
    e.storage()
        .instance()
        .get(&DataKey::TokenContractId)
        .unwrap()
}

fn read_reward_amount(e: &Env) -> i128 {
    require_init(e);
    e.storage().instance().get(&DataKey::RewardAmount).unwrap()
}

#[contractimpl]
impl VotingContract {
    pub fn init(e: Env, admin: Address, token_contract_id: Address, reward_amount: i128) {
        if e.storage().instance().has(&DataKey::Admin) {
            // idempotency: ignore re-init attempts
            return;
        }
        e.storage().instance().set(&DataKey::Admin, &admin);
        e.storage()
            .instance()
            .set(&DataKey::TokenContractId, &token_contract_id);
        e.storage()
            .instance()
            .set(&DataKey::RewardAmount, &reward_amount);
    }

    pub fn set_proposal(e: Env, caller: Address, id: u32, title: String) {
        let admin = read_admin(&e);
        caller.require_auth();
        if caller != admin {
            panic_with_error!(&e, VotingError::NotAuthorized);
        }

        let existed = e.storage().instance().has(&DataKey::Proposal(id));
        let p = Proposal { id, title, votes: 0 };
        e.storage().instance().set(&DataKey::Proposal(id), &p);

        if !existed {
            let mut ids: Vec<u32> = e
                .storage()
                .instance()
                .get(&DataKey::ProposalIds)
                .unwrap_or(Vec::new(&e));
            ids.push_back(id);
            e.storage().instance().set(&DataKey::ProposalIds, &ids);
        }
    }

    pub fn get_proposal(e: Env, id: u32) -> Proposal {
        require_init(&e);
        e.storage()
            .instance()
            .get(&DataKey::Proposal(id))
            .unwrap_or_else(|| panic_with_error!(&e, VotingError::ProposalNotFound))
    }

    pub fn get_proposal_ids(e: Env) -> Vec<u32> {
        require_init(&e);
        e.storage()
            .instance()
            .get(&DataKey::ProposalIds)
            .unwrap_or(Vec::new(&e))
    }

    pub fn list_proposals(e: Env, start: u32, limit: u32) -> Vec<Proposal> {
        require_init(&e);
        let ids = Self::get_proposal_ids(e.clone());
        let mut out: Vec<Proposal> = Vec::new(&e);

        let ids_len: u32 = ids.len();
        let mut i = start;
        while i < ids_len && out.len() < limit {
            let id = ids.get(i).unwrap();
            out.push_back(Self::get_proposal(e.clone(), id));
            i += 1;
        }
        out
    }

    pub fn has_voted(e: Env, proposal_id: u32, voter: Address) -> bool {
        require_init(&e);
        e.storage()
            .instance()
            .has(&DataKey::HasVoted(proposal_id, voter))
    }

    pub fn vote(e: Env, proposal_id: u32, voter: Address) {
        require_init(&e);
        voter.require_auth();

        if e.storage()
            .instance()
            .has(&DataKey::HasVoted(proposal_id, voter.clone()))
        {
            panic_with_error!(&e, VotingError::AlreadyVoted);
        }

        let mut p: Proposal = e
            .storage()
            .instance()
            .get(&DataKey::Proposal(proposal_id))
            .unwrap_or_else(|| panic_with_error!(&e, VotingError::ProposalNotFound));

        p.votes = p.votes.saturating_add(1);
        e.storage().instance().set(&DataKey::Proposal(proposal_id), &p);
        e.storage()
            .instance()
            .set(&DataKey::HasVoted(proposal_id, voter.clone()), &true);

        let token_id = read_token_contract_id(&e);
        let reward_amount = read_reward_amount(&e);

        // Minting is not part of SEP-41; our deployed token contract will expose `mint`.
        // This call is atomic with the vote and prevents double-minting.
        let token = mint_token::MintTokenClient::new(&e, &token_id);
        token.mint(&voter, &reward_amount);

        e.events().publish(
            (symbol_short!("vote_cast"),),
            (proposal_id, voter.clone()),
        );
        e.events()
            .publish((Symbol::new(&e, "tokens_rewarded"),), (voter, reward_amount));
    }
}

#[cfg(test)]
mod test {
    extern crate std;

    use super::*;
    use soroban_sdk::testutils::Address as _;
    use soroban_sdk::Env;
    use reward_token::{RewardToken, RewardTokenClient};

    #[test]
    fn vote_happy_path_mints_and_marks_voted() {
        let e = Env::default();
        let admin = Address::generate(&e);
        let voter = Address::generate(&e);

        let token_addr = e.register(RewardToken, ());
        let token = RewardTokenClient::new(&e, &token_addr);

        // Deploy voting contract.
        let voting_addr = e.register(VotingContract, ());
        let voting = VotingContractClient::new(&e, &voting_addr);

        let reward: i128 = 10;
        voting.init(&admin, &token_addr, &reward);
        e.mock_all_auths();

        token.init(
            &admin,
            &String::from_str(&e, "RewardToken"),
            &String::from_str(&e, "RWD"),
            &7u32,
        );
        token.set_admin(&admin, &voting_addr);

        voting.set_proposal(&admin, &1, &String::from_str(&e, "Proposal_1"));
        voting.set_proposal(&admin, &2, &String::from_str(&e, "Proposal_2"));

        let ids = voting.get_proposal_ids();
        assert_eq!(ids.len(), 2);

        voting.vote(&1, &voter);

        assert!(voting.has_voted(&1, &voter));

        assert_eq!(token.balance(&voter), reward);

        let p = voting.get_proposal(&1);
        assert_eq!(p.votes, 1);
    }

    #[test]
    #[should_panic]
    fn cannot_double_vote() {
        let e = Env::default();
        let admin = Address::generate(&e);
        let voter = Address::generate(&e);

        let token_addr = e.register(RewardToken, ());
        let token = RewardTokenClient::new(&e, &token_addr);
        let voting_addr = e.register(VotingContract, ());
        let voting = VotingContractClient::new(&e, &voting_addr);

        e.mock_all_auths();

        voting.init(&admin, &token_addr, &5i128);
        token.init(
            &admin,
            &String::from_str(&e, "RewardToken"),
            &String::from_str(&e, "RWD"),
            &7u32,
        );
        token.set_admin(&admin, &voting_addr);

        voting.set_proposal(&admin, &7, &String::from_str(&e, "P7"));

        voting.vote(&7, &voter);
        voting.vote(&7, &voter);
    }
}

