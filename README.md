# Paxful API SDK

[![Paxful Javascript SDK](https://github.com/paxful/sdk-js/actions/workflows/github-actions-paxful.yml/badge.svg)](https://github.com/paxful/sdk-js/actions/workflows/github-actions-paxful.yml)

This SDK is to be used to simplify creation of software that consumes APIs provided by Paxful.

It can be used with Javascript and Typescript projects or any other language that is **transpiled to Javascript**.

## Features
* Takes care of intricacies of OAuth2 protocol implementation - just instantiate the library and use the high level API
* Automatic keys rotation and persistence
* Error handling
* Fluent API (coming soon)
* `Client Credentials` and `Authorization Code Grant` flows support (read below)

## Installation

To install SDK to your NPM project you need to run the following command:

 ```bash
 npm i @paxful/sdk-js
 ```

## Getting started

The very first thing you need to do is to create an application and get your `Client ID` (`App ID` on developers portal) 
and `Secret`. You can do that by creating an application [here](https://developers.paxful.com/apps/new/). Once
you have created an application, do not forget to add at least one product to it, you can do that under `Products`.

## Supported flows

`Client Credentials` flow you may want to use when are the owner of the account that you're going to be updating using 
the APIs. The `Authorization Code Grant` flow is to be used when you would like to get access to another user's 
account and start performing some operations upon it on behalf of the user.

If you are just staring with the SDK and want to play around, we suggest you going with `Client Credentials` flow. 
Switching later to `Authorization Code Flow` will require minimum updates to the existing code base - you will just need 
to implement a thin persistence layer (as explained below) and a couple of controllers which are used for redirects.

### Client credentials flow
 
This is how you can get started with `Client Credentials` flow: 
```typescript
import usePaxful from "@paxful/sdk-js";

const paxfulApi = usePaxful({
    clientId: "YOUR CLIENT ID HERE",
    clientSecret: "YOUR CLIENT SECRET HERE",
    //  scope: ["profile", "email"] // Optional variable for passing requested scopes.
});
```

After you have instantiated an instance you can use its `invoke` method:
```typescript
const myOffers = paxfulApi.invoke('offer/all');
```

### Authorization Code Grant flow

To use authorization flow beside `clientId` and `clientSecret` you also need to specify `redirectUri`, this is 
where a user would be returned once he has granted/or not the access you have requested (`scopes`). 
 ```typescript
import usePaxful from "@paxful/sdk-js";

const paxfulApi = usePaxful({
    clientId: "YOUR CLIENT ID HERE",
    clientSecret: "YOUR CLIENT SECRET HERE",
    redirectUri: "YOUR REDIRECT URI HERE",
    //  scope: ["profile", "email"] // Optional variable for passing requested scopes.
});
 ```
The SDK is framework agnostic and only relies on a generic `Http2ServerResponse` for working with the web layer. The
controller endpoint that you would specify for `redirectUri` could look akin to the following:

```javascript
function callback(response) {
    paxfulApi.login(response);
}
```
Login method would do all the necessary OAuth2 machinery for you in order to receive an access token. Once the `login`
operation method has been invoked, you can start using `invoke` method to access endpoints on behalf of a user
in the same way as in `Client Credentials` flow:
```
const myOffers = paxfulApi.invoke('offer/all');
```

#### Persistence

By default, when `Authorization Code Grant` flow is used the SDK relies on in-memory storage for storing credentials. 
That means if you stop your NodeJS application, data will be lost and user will be asked again to authorise your 
application. In order to avoid that you may implement `CredentialStorage` that would keep credentials in a storage of 
your liking. Given that every schema and application requirements are different we are not shipping any implementation of 
`CredentialsStorage` out of the box beside in-memory one. The interface is very simple and contains only two methods - 
`getCredentials` and `saveCredentials` thus implementing a proper storage for your application should take no time.

Once you have implemented the interface, you may pass its instance as a second argument to `usePaxful` helper method,
for example:

```typescript
const redisCredentialsStorage = new MyFancyRedisCredentialsStorage();
const paxfulApi = usePaxful({
    clientId: "YOUR CLIENT ID HERE",
    clientSecret: "YOUR CLIENT SECRET HERE",
    redirectUri: "YOUR REDIRECT URI HERE",
    //  scope: ["profile", "email"] // Optional variable for passing requested scopes.
}, redisCredentialsStorage);
```

## Contributing
### Pre-requisites

* Node JS (preferable installed by NVM) v12+

### Tests

To run the tests execute the following command:
```shell
npm run lint
npm test
```

Please follow TDD to develop at this project. This means that you
need to follow this steps:

* Create the test for the feature
* Make the test pass
* Refactor without breaking the tests

Keep in mind that every new feature, bugfix or hotfix needs to
follow this rule.

### Documentation

To generate the documentation, execute the following command:
```shell
npm run doc
```

The documentation will be generated at `public/` folder.

## License

```markdown
Copyright (C) (2021) Paxful Inc.

All rights reserved - Do Not Redistribute
```
