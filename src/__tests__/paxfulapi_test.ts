import httpMocks from "node-mocks-http";
import { v4 as UUID } from "uuid";
import fetch from "node-fetch";
import { mock } from "jest-mock-extended";
import ProxyAgent from "simple-proxy-agent";

import usePaxful from "../";
import { CredentialStorage } from "../oauth";
import { PaxfulApi } from "../PaxfulApi";
import { FetchMockSandbox } from "fetch-mock";

const credentials = {
    clientId: UUID(),
    clientSecret: UUID(),
    redirectUri: "callback"
};

const ttl = 3600;
const expectedTokenAnswer = {
    accessToken: UUID(),
    refreshToken: UUID(),
}

const proxyAgent = new ProxyAgent("http://proxy_url:proxy_port");

const picture = "https://paxful.com/2/images/avatar.png";
const userProfile = {
    sub: UUID(),
    nickname: UUID(),
    given_name: UUID(),
    family_name: UUID(),
    locale: "en",
    picture,
    email: `${UUID()}@paxful.test.com`,
    email_verified: true
};

const credentialStorage = mock<CredentialStorage>();
const paxfulTradeUrl = '/paxful/v1/trade/get';

function mockCredentialsStorageReturnValue() {
    credentialStorage.getCredentials.mockReturnValueOnce({
        ...expectedTokenAnswer,
        expiresAt: new Date()
    });
}

describe("With the Paxful API SDK", function () {

    beforeEach(() => {
        Reflect.set(PaxfulApi, "api", undefined);
        (fetch as unknown as FetchMockSandbox).reset();

        (fetch as unknown as FetchMockSandbox).once({
            url: /oauth2\/token/,
            method: "POST"
        }, {
            status: 200,
            body: JSON.stringify({
                access_token: expectedTokenAnswer.accessToken,
                refresh_token: expectedTokenAnswer.refreshToken,
                expires_in: ttl
            })
        }, {
            sendAsJson: false
        });
    });

    it('SDK points to Paxful production by default when using an empty string', function () {
        process.env.PAXFUL_OAUTH_HOST = "";
        const paxfulApi = usePaxful(credentials);
        const response = httpMocks.createResponse();

        paxfulApi.login(response);
        expect(response.getHeaders().location).toMatch(/https:\/\/accounts.paxful.com/);
    });

    it('I can configure to connect to Paxful', function () {
        const paxfulApi = usePaxful(credentials);
        expect(paxfulApi).toBeDefined();
    });

    it('I can login to have my access authorized', function () {
        const paxfulApi = usePaxful(credentials);

        const response = httpMocks.createResponse();

        paxfulApi.login(response);

        expect(response._getStatusCode()).toBe(302);
        expect(response.getHeaders().location).toMatch(/\/oauth2\/authorize/);
        expect(response.getHeaders().location).toMatch(/response_type=code/);
        expect(response.getHeaders().location).toMatch(/scope=profile\+email/);
        expect(response.getHeaders().location).toMatch(new RegExp(`client_id=${credentials.clientId}`));
        expect(response.getHeaders().location).toMatch(new RegExp(`redirect_uri=${credentials.redirectUri}`));
    });

    it('I receive an error if I dont add a redirect uri for authorization flow', function () {
        const credentialsWithoutUri = {
            ...credentials,
            redirectUri: ""
        }
        const paxfulApi = usePaxful(credentialsWithoutUri);

        const response = httpMocks.createResponse();

        expect(() => {
            paxfulApi.login(response);
        }).toThrowError();
    });

    it('I can get a impersonated access token and refresh token', async function () {
        const paxfulApi = usePaxful(credentials);

        const response = await paxfulApi.impersonatedCredentials(UUID());

        expect(response).toMatchObject(expectedTokenAnswer);
    });

    it('I can get a impersonated access token and refresh token using a proxy', async function () {
        const paxfulApi = usePaxful({ ...credentials, proxyAgent });

        const response = await paxfulApi.impersonatedCredentials(UUID());

        expect(response).toMatchObject(expectedTokenAnswer);
    });

    it('I can save my impersonated tokens', async function () {
        const paxfulApi = usePaxful(credentials, credentialStorage);

        await paxfulApi.impersonatedCredentials(UUID());

        expect(credentialStorage.saveCredentials).toBeCalled()
    });

    it('I can get my own access token and refresh token', async function () {
        const paxfulApi = usePaxful(credentials);

        const response = await paxfulApi.myCredentials();

        expect(response).toMatchObject(expectedTokenAnswer);
    });

    it('I can get my own access token and refresh token using a proxy', async function () {
        const paxfulApi = usePaxful({ ...credentials, proxyAgent });

        const response = await paxfulApi.myCredentials();

        expect(response).toMatchObject(expectedTokenAnswer);
    });

    it('I can save my own tokens', async function () {
        const paxfulApi = usePaxful(credentials, credentialStorage);

        await paxfulApi.myCredentials();

        expect(credentialStorage.saveCredentials).toBeCalled()
    });

    it('I can get my profile', async function () {
        (fetch as unknown as FetchMockSandbox).once({
            url: /oauth2\/userinfo/,
            method: "GET"
        }, {
            status: 200,
            body: JSON.stringify(userProfile)
        }, {
            sendAsJson: false
        });

        credentialStorage.getCredentials.mockReturnValueOnce({
            ...expectedTokenAnswer,
            expiresAt: new Date()
        });

        const paxfulApi = usePaxful(credentials, credentialStorage);

        const profile = await paxfulApi.getProfile();

        expect(profile).toMatchObject(userProfile);
    });

    it('I can get my profile using a proxy', async function () {
        const userProfile = {
            sub: UUID(),
            nickname: UUID(),
            given_name: UUID(),
            family_name: UUID(),
            locale: "en",
            picture,
            email: `${UUID()}@paxful.test.com`,
            email_verified: true
        };

        (fetch as unknown as FetchMockSandbox).once({
            url: /oauth2\/userinfo/,
            method: "GET"
        }, {
            status: 200,
            body: JSON.stringify(userProfile)
        }, {
            sendAsJson: false
        });

        credentialStorage.getCredentials.mockReturnValueOnce({
            ...expectedTokenAnswer,
            expiresAt: new Date()
        });

        const paxfulApi = usePaxful({ ...credentials, proxyAgent }, credentialStorage);

        const profile = await paxfulApi.getProfile();

        expect(profile).toMatchObject(userProfile);
    });

    it('I can get my trades if data host is empty', async function () {
        process.env.PAXFUL_DATA_HOST = "";

        mockCredentialsStorageReturnValue();

        const expectedTrades = [];

        (fetch as unknown as FetchMockSandbox).once({
            url: /https:\/\/api\.paxful\.com\/paxful\/v1\/trade\/get/,
            method: "POST"
        }, {
            status: 200,
            body: JSON.stringify(expectedTrades)
        }, {
            sendAsJson: false
        });

        const paxfulApi = usePaxful(credentials, credentialStorage);

        const trades = await paxfulApi.invoke(paxfulTradeUrl);

        expect(trades).toMatchObject(expectedTrades);
    });

    it('I can get my trades', async function () {
        credentialStorage.getCredentials.mockReturnValueOnce({
            ...expectedTokenAnswer,
            expiresAt: new Date()
        });

        const expectedTrades = [];

        (fetch as unknown as FetchMockSandbox).once({
            url: /https:\/\/api\.paxful\.com\/paxful\/v1\/trade\/get/,
            method: "POST"
        }, {
            status: 200,
            body: JSON.stringify(expectedTrades)
        }, {
            sendAsJson: false
        });

        const paxfulApi = usePaxful(credentials, credentialStorage);

        const trades = await paxfulApi.invoke(paxfulTradeUrl);

        expect(trades).toMatchObject(expectedTrades);
    });

    it('I can get my trades using a proxy', async function () {
        credentialStorage.getCredentials.mockReturnValueOnce({
            ...expectedTokenAnswer,
            expiresAt: new Date()
        });

        const expectedTrades = [];

        (fetch as unknown as FetchMockSandbox).once({
            url: /https:\/\/api\.paxful\.com\/paxful\/v1\/trade\/get/,
            method: "POST"
        }, {
            status: 200,
            body: JSON.stringify(expectedTrades)
        }, {
            sendAsJson: false
        });

        const paxfulApi = usePaxful({ ...credentials, proxyAgent }, credentialStorage);

        const trades = await paxfulApi.invoke(paxfulTradeUrl);

        expect(trades).toMatchObject(expectedTrades);
    });

    it('I dont need to worry about refreshing my credentials', async function () {
        (fetch as unknown as FetchMockSandbox).once({
            name: 'invalid_access_token',
            url: /oauth2\/userinfo/,
            method: "GET",
            headers: {
                "Authorization": `Bearer ${expectedTokenAnswer.accessToken}`
            }
        }, {
            status: 401,
            body: ""
        }, {
            sendAsJson: false
        }).once({
            name: 'correct_access_token',
            url: /oauth2\/userinfo/,
            method: "GET"
        }, {
            status: 200,
            body: JSON.stringify(userProfile)
        }, {
            sendAsJson: false
        });

        credentialStorage.getCredentials.mockReturnValue({
            ...expectedTokenAnswer,
            expiresAt: new Date()
        });

        const paxfulApi = usePaxful(credentials, credentialStorage);

        const profile = await paxfulApi.getProfile();

        expect(profile).toMatchObject(userProfile);
    });

    it('I can create an offer', async function () {
        credentialStorage.getCredentials.mockReturnValueOnce({
            ...expectedTokenAnswer,
            expiresAt: new Date()
        });

        const expectedTrades = [];

        const newOffer = {
            margin: 10,
            currency: 'BTC',
            range_max: 1,
            range_min: 1,
            offer_terms: 'Offer terms',
            trade_details: 'Trade details',
            payment_method: 'gcc',
            payment_window: 30,
            offer_type_field: 'sell',
            nested: {
                key1: '1',
                key2: '2',
                key3: [0, 1]
            }
        };

        (fetch as unknown as FetchMockSandbox).once({
            url: /https:\/\/api\.paxful\.com\/paxful\/v1\/offer\/create/,
            method: "POST",
            matcher: (_, opts) => {
                return opts.body.then(body => {
                    return body === 'currency=BTC&margin=10&offer_terms=Offer terms&offer_type_field=sell&payment_method=gcc&payment_window=30&range_max=1&range_min=1&trade_details=Trade details&nested[key1]=1&nested[key2]=2&nested[key3][0]=0&nested[key3][1]=1';
                })
            }
        }, {
            status: 200,
            body: JSON.stringify(expectedTrades)
        }, {
            sendAsJson: false
        });

        const paxfulApi = usePaxful(credentials, credentialStorage);

        const trades = await paxfulApi.invoke('/paxful/v1/offer/create', newOffer);

        expect(trades).toMatchObject(expectedTrades);
    });
});
