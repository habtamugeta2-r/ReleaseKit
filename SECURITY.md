# Security policy

Do not report vulnerabilities in public issues. Contact the repository owner privately through GitHub with a concise impact description and reproduction details that do not include real credentials or personal data.

Never commit secrets. Rotate any credential that may have been exposed; removing it from the latest commit is not sufficient. Production deployment uses GitHub OIDC and least-privilege AWS roles. Security fixes should include a regression test where practical.

Supported version: the current `main` branch.
