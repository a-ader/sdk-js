import fetch, { Request, Response } from "node-fetch";
import { URLSearchParams } from "url";

import { AccountServiceTokenResponse, Credentials, CredentialStorage } from "../oauth";
import { ApiConfiguration } from "../ApiConfiguration";

const refreshAccessToken = async (credentials: Credentials, config: ApiConfiguration): Promise<Credentials> => {
    const form = new URLSearchParams();
    form.append("grant_type", "refresh_token");
    form.append("refresh_token", credentials.refreshToken);
    form.append("client_id", config.clientId);
    form.append("client_secret", config.clientSecret);

    return await fetch(
        new Request({
            href: `${process.env.PAXFUL_OAUTH_HOST}/oauth2/token`
        }, {
            method: "POST",
            headers: {
                "Content-Type": "application/x-www-form-urlencoded",
                "Accepts": "application/json"
            },
            body: form
        })
    ).then(response => response.json() as Promise<AccountServiceTokenResponse>)
        .then((tokenResponse: AccountServiceTokenResponse) => ({
            accessToken: tokenResponse.access_token,
            refreshToken: tokenResponse.refresh_token,
            expiresAt: new Date(Date.now() + (tokenResponse.expires_in * 1000))
        }));
}

const createRequest = async (request: Request, credentialStorage: CredentialStorage, config: ApiConfiguration): Promise<Request> => {
    let credentials = credentialStorage.getCredentials()
    credentials = await refreshAccessToken(credentials, config);
    credentialStorage.saveCredentials(credentials);

    request.headers["Authorization"] = credentials.accessToken;

    return Promise.resolve(request);
}

const validateIfTokenIsExpired = async (request: Request, response: Response, credentialStorage: CredentialStorage, config: ApiConfiguration): Promise<Response> => {
    if (response.status === 401) return await fetch(await createRequest(request, credentialStorage, config));
    return Promise.resolve(response);
}

export default function validateAndRefresh(request: Request, response: Response, credentialStorage: CredentialStorage, config: ApiConfiguration): Promise<Response> {
    return validateIfTokenIsExpired(request, response, credentialStorage, config);
}