---
editUrl: false
next: false
prev: false
title: "WebbiSDK"
---

The main entry point for the WebbiOS SDK.
Provides unified access to all API modules.

## Constructors

### Constructor

> **new WebbiSDK**(`options?`): `WebbiSDK`

Initializes a new WebbiSDK instance.

#### Parameters

##### options?

[`WebbiSDKOptions`](/sdk/reference/interfaces/webbisdkoptions/)

Configuration options for the SDK.

#### Returns

`WebbiSDK`

## Properties

### adminUpdates

> **adminUpdates**: `AdminUpdatesClient`

Admin Updates module

***

### auth

> **auth**: [`AuthModule`](/sdk/reference/classes/authmodule/)

Authentication module

***

### client

> **client**: [`ApiClient`](/sdk/reference/classes/apiclient/)

The core API client instance

***

### dashboard

> **dashboard**: [`DashboardModule`](/sdk/reference/classes/dashboardmodule/)

Dashboard module

***

### menus

> **menus**: [`MenusModule`](/sdk/reference/classes/menusmodule/)

Menus module

***

### permissions

> **permissions**: `PermissionsModule`

Permissions module

***

### platform

> **platform**: [`PlatformModule`](/sdk/reference/classes/platformmodule/)

Platform module

***

### products

> **products**: [`ProductsModule`](/sdk/reference/classes/productsmodule/)

Products module

***

### roles

> **roles**: `RolesModule`

Roles module

***

### settings

> **settings**: [`SettingsModule`](/sdk/reference/classes/settingsmodule/)

Settings module

## Methods

### onAuthError()

> **onAuthError**(`callback`): `void`

Sets a callback to be triggered when an authentication error occurs.

#### Parameters

##### callback

() => `void`

The function to call on auth error.

#### Returns

`void`

***

### setToken()

> **setToken**(`token`): `void`

Updates the authentication token across the entire SDK.

#### Parameters

##### token

`string`

The new JWT access token.

#### Returns

`void`
