# Publishing TrueCase

Publishing is free on both marketplaces. The account and token steps are
yours (they are tied to your identity); everything else is prepared here.

## What is already done

- The extension is packaged as `truecase-1.0.2.vsix` in this repo's release
  artifacts (rebuild any time with `npm run package`).
- `package.json` carries the metadata both marketplaces read.

## VS Code Marketplace

1. Create a free Azure DevOps account at https://dev.azure.com (sign in
   with any Microsoft account).
2. Create a Personal Access Token: User settings -> Personal access tokens
   -> New Token. Organization: **All accessible organizations**. Scope:
   **Marketplace -> Manage**.
3. Create a publisher at
   https://marketplace.visualstudio.com/manage/publishers
   The publisher ID must equal the `publisher` field in `package.json`
   (currently `AdityaaKulkarni`); either take that ID or change the field.
4. Then, in this folder:

   ```bash
   npx vsce login AdityaaKulkarni   # paste the PAT when asked
   npm run package                  # rebuilds truecase-1.0.2.vsix
   npx vsce publish                 # or: npx vsce publish -p <PAT>
   ```

5. The listing goes live within minutes and verifies automatically.

## Open VSX (free alternative, used by VSCodium and others)

1. Create an Eclipse account at https://accounts.eclipse.org and sign the
   Open VSX Publisher Agreement.
2. Create a token at https://open-vsx.org/user-settings/tokens.
3. Then:

   ```bash
   npx ovsx publish truecase-1.0.2.vsix -p <token>
   ```

The namespace `AdityaaKulkarni` on Open VSX is claimed on first publish.

## Notes

- If the marketplace says the name `truecase` is taken, change `name` in
  `package.json`, bump nothing else, and repackage.
- The `.vsix` can also be installed locally for testing:
  Extensions view -> `...` -> Install from VSIX.
