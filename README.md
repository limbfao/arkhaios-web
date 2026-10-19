# Arkhaios Web Server

### Contents
- [Getting started](#Getting-started)
- [Local demo (no .env needed)](#Local-demo-no-env-needed)
- [Dependencies](#Dependencies)
- [Contributing](#Contributing)

## Getting started
1. **Install dependencies**: Refer to the [Dependencies](#Dependencies) section below for further instructions.
2. **Clone the repository**: Clone `arkhaios-web` onto your local machine using either HTTPS or SSH.
3. **Retrieve a copy of the `.env` file**: Obtain a copy of the `.env` file required for environment setup.
4. **Install packages**: Run `yarn install` to install all required Node.js packages.
5. **Run server** Run a local server with `yarn run start`.

## Local demo (no .env needed)
Run the whole app locally with fake data, without any production credentials:

```bash
yarn install
yarn demo          # or ./demo/start.sh
```

Then open http://localhost:3000 and sign in with `demo@arkhaios.test` / `demo1234`.
Requires Docker (for local MongoDB and Redis).

What demo mode does:
- Starts MongoDB (port 27018) and Redis (port 6380) in Docker containers and seeds them on first run
  (`demo/seed.js`): five users, two funds, friends, chat history, notifications and a watchlist.
- Replaces external services with local fakes (`demo/mock-apis.js`): Alpaca brokerage, Yahoo Finance
  charts, Finnhub news, the fund history service and SendGrid. Verification codes are printed in the
  server log instead of emailed. Plaid bank linking uses sample banks.
- Prices follow one continuous path per symbol (`demo/market.js`), so quotes, charts, positions and
  portfolio value always agree. Stocks trade during US market hours; crypto trades 24/7.
- The fake brokerage is stateful: orders check buying power and holdings, fills move cash and
  positions, limit orders fill when the price crosses, and deposits settle after about 20 seconds.
  Its state lives in `demo/.state.json`.

| Account | Password | Role |
|---|---|---|
| `demo@arkhaios.test` | `demo1234` | Manages the Arkhaios Growth fund (ARKG), investor in Blue Harbor Value |
| `priya@arkhaios.test` | `demo1234` | Manages Blue Harbor Value (BHV) |
| `marcus@arkhaios.test` | `demo1234` | Fund member without a fund of his own |
| `sofia@arkhaios.test`, `jordan@arkhaios.test` | `demo1234` | Pending friend and fund requests |

The app keeps one session per account, so signing in elsewhere signs out the previous session.
Use `yarn demo:reset` to restore the original demo data.

## Dependencies
* Install the following dependencies:
    - [Git](https://git-scm.com/book/en/v2/Getting-Started-Installing-Git)
    - [Node.js (version 20+)](https://nodejs.org/en/download)
    - We use [Yarn](https://yarnpkg.com/getting-started/install) for our package manager. You may also use `npm`, though you may end up with discrepancies in package versions.

## Contributing
* **IMPORTANT**: Do not add any .env files or secrets to the repo!
* Any new features should be developed on a separate branch. Do not push to main; create a new pull request.

## Routing
* Each api route is defined in a separate file within the `/api` directory. The files must export a `get` or `post` function depending on the HTTP request performed. The required module exports are as follows:
    - `route`: the relative path of the api url
    - `authenticate`: whether the api requires user authentication
    - `unverified`: whether the api can be accessed without email/mfa verification. By default, all api's with `authenticate` assume verification is required.
    - `kyc`: whether the api requires KYC acceptance, e.g., whether the user can perform trading operations
    - `post`: an optional POST function for the route
    - `get`: an optional GET function for the route

Each `post` and `get` function take up to three parameters: `req`, `res`, `user`; the request, response, and user object respectively. Only if `authenticate` is set to true will a `post` or `get` function be passed a user object.