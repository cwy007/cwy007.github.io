---
layout:     post
title:      "vscode: Warnning Incorrect type. Expected \"String\""
subtitle:   "vscode json format"
date:       2020-07-13 22:33:00
author:     "chanweiyan"
header-style: text
catalog: true
tags:
  - vscode
---

Cancelling vscode warnning `Incorrect type. Expected "String"`

```json
// ~/Library/Application Support/Code/User/settings.json

"json.schemas": [{
  "fileMatch": ["**/*.json"],
  "url": "http: //json.schemastore.org/chrome-manifest"
}],
```

* https://stackoverflow.com/questions/58944042/cancelling-vscode-warnning-incorrect-type-expected-array
