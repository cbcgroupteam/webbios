---
editUrl: false
next: false
prev: false
title: "MenusModule"
---

Provides methods to retrieve navigation menus.

## Constructors

### Constructor

> **new MenusModule**(`client`): `MenusModule`

#### Parameters

##### client

[`ApiClient`](/sdk/reference/classes/apiclient/)

#### Returns

`MenusModule`

## Methods

### createMenu()

> **createMenu**(`data`): `Promise`\<\{ `data`: [`MenuItem`](/sdk/reference/interfaces/menuitem/); `success`: `boolean`; \}\>

Creates a new menu item.

#### Parameters

##### data

`any`

The menu item data.

#### Returns

`Promise`\<\{ `data`: [`MenuItem`](/sdk/reference/interfaces/menuitem/); `success`: `boolean`; \}\>

***

### deleteMenu()

> **deleteMenu**(`id`): `Promise`\<\{ `success`: `boolean`; \}\>

Deletes a menu item.

#### Parameters

##### id

`string`

The ID of the menu item.

#### Returns

`Promise`\<\{ `success`: `boolean`; \}\>

***

### getMenus()

> **getMenus**(): `Promise`\<\{ `data`: [`MenuItem`](/sdk/reference/interfaces/menuitem/)[]; \}\>

Retrieves the hierarchical list of navigation menus based on user permissions.

#### Returns

`Promise`\<\{ `data`: [`MenuItem`](/sdk/reference/interfaces/menuitem/)[]; \}\>

A promise resolving to an array of MenuItem trees.

***

### reorderMenus()

> **reorderMenus**(`items`): `Promise`\<\{ `success`: `boolean`; \}\>

Batch reorder menus - updates parentId and position for multiple items at once.

#### Parameters

##### items

`object`[]

Array of {id, parentId, position}

#### Returns

`Promise`\<\{ `success`: `boolean`; \}\>

***

### updateMenu()

> **updateMenu**(`id`, `data`): `Promise`\<\{ `success`: `boolean`; \}\>

Updates an existing menu item.

#### Parameters

##### id

`string`

The ID of the menu item.

##### data

`any`

The updated data.

#### Returns

`Promise`\<\{ `success`: `boolean`; \}\>
