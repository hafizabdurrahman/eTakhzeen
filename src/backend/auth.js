import envVars from '../../envVars/vars';
import { Client, Account } from 'appwrite';
import user from './user';

export class Auth {
    client = new Client();
    account;

    constructor() {
        this.client
            .setEndpoint(envVars.eTakhzeenURL)
            .setProject(envVars.eTakhzeenProjectId);
        this.account = new Account(this.client);
    }

    // Throws on failure (with .code / .type from AppwriteException) so the
    // caller can distinguish "already exists" (409) from other errors.
    async signup({ username, name, email, password, phone }) {
        await this.account.create({ userId: username, email, password, name });

        const loggedIn = await this.login({ email, password });
        if (!loggedIn) {
            throw new Error('Account was created, but automatic login failed.');
        }

        const stored = await user.setUser({ username, name, email, password, phone });
        if (stored !== true) {
            throw new Error('Account was created, but saving profile data failed.');
        }

        return true;
    }

    async login({ email, password }) {
        try {
            return (await this.account.createEmailPasswordSession({ email, password })) ? true : false;
        } catch (error) {
            console.error(error.message);
            return false;
        }
    }

    async logout() {
        try {
            await this.account.deleteSession('current');
            return 'Logged out successfully';
        } catch (error) {
            console.log(error.message);
            return false;
        }
    }

    // inside auth.js, wherever getCurrentUser() currently does something like:
    //   const account = await this.account.get();
    //   return account;

    async getCurrentUser() {
        try {
            const account = await this.account.get();

            // Auth account has no "blocked" field — that only lives on the
            // custom user table row. Merge it in so anything reading userData
            // from Redux (BlockedGuard, CheckUser, CheckAdmin) sees it.
            const profileRow = await user.getProfile({
                requesterLabels: account.labels,
                requesterId: account['$id'],
                targetId: account['$id'],
            });

            return {
                ...account,
                blocked: profileRow?.blocked ?? false,
            };
        } catch (error) {
            return 'User not found';
        }
    }

    // ---------------------------------------------------------------
    // Checkout-flow helper. Looks the email up in the user table first:
    //   - already exists  -> log in with the given password
    //   - doesn't exist    -> create the account (reuses signup() above)
    //
    // Doesn't change how signup()/login()/logout() behave anywhere else in
    // the app — this only combines them for the "checkout as guest" case.
    // Throws on any failure so the caller can show the message to the user.
    // Returns { row, isNewAccount } where `row` is the user's table row.
    // ---------------------------------------------------------------
    async loginOrSignup({ username, name, email, password, phone }) {
        const exists = await user.getUniqueUser({ property: 'email', value: email });

        if (exists === false) {
            throw new Error('Could not verify your account details. Please try again.');
        }

        if (exists === 'ok') {
            const loggedIn = await this.login({ email, password });
            if (!loggedIn) {
                throw new Error('An account with this email already exists, but the password is incorrect.');
            }
            const row = await user.getProfile({ requesterId: username });
            if (!row) {
                throw new Error('Logged in, but could not load your profile.');
            }
            return { row, isNewAccount: false };
        }

        await this.signup({ username, name, email, password, phone });
        const row = await user.getProfile({ requesterId: username });
        if (!row) {
            throw new Error('Account created, but could not load your profile.');
        }
        return { row, isNewAccount: true };
    }
}

const auth = new Auth();

export default auth;