# Jira Release Action

This Github action exports Github releases to Jira. By running this action in a workflow that gets
triggered by new releases, "project versions" on Jira can be automatically synchronized with Github releases.
Jira issues that match a specified search query and have been resolved in the time span between the new
and the previous release will have their 'Fix Version' field set to the new release.

Development happens on branch `inverso-devel`. Branch `main` contains the original version of the code
and is being preserved so that we can update our fork with mainline development if necessary.

## Usage

### Input

| Name | Description | Required |
|---|---|---|
| jira_email  | Jira login | Y |
| jira_api_token | Jira API token | Y |
| jira_base_url | Base URL of the JIRA API (see below) | Y |
| jira_project | Key of the Jira project | Y |
| jira_issue_filter | Additional filtering criteria for issues | N |
| github_api_token | GitHub PAT | Y |
| github_org | GitHub repository owner | Y |
| github_repo | GitHub repository name | Y |
| dry_run | Dump actions that would be taken | N (default: false) |

### JIRA Parameters

An API token can either be unscoped (access to all Atlassian products with the permissions of
the token creator) or scoped (access is limited to selected products and operations - recommended).
This Action requires a scoped token with access to Jira and the following permissions ("Classic"):
manage:jira-project, read:jira-work, write:jira-work

Parameter `jira_email` must be set to the e-mail address of the user who created the token.

The base URL depends on the type of token: When using an unscoped token, the correct base URL
is `[domain].atlassian.net`, e.g. `inversocloud.atlassian.net`.
When using a scoped token, the base URL has the following format:
`api.atlassian.com/ex/jira/[cloudId]`.
The cloud ID can be obtained by calling `curl "https://[domain].atlassian.net/_edge/tenant_info"`.
At the time of writing, the ID of `inversocloud` is `fb557a4a-a743-4adf-bf61-1accd10cded5`.

### GitHub Parameters

In a GitHub Workflow, set `github_api_token` to `${{ secrets.GITHUB_TOKEN }}`.

### Example Workflow

```yaml
name: Export new releases to Jira
on:
  release:
    types: [published]
  workflow_dispatch:

jobs:
  main:
    runs-on: ubuntu-latest
    steps:
      - name: Export releases
        uses: inverso-dna/jira-release-actions@inverso-devel
        with:
          jira_email: ${{ secrets.JIRA_EMAIL }}
          jira_api_token: ${{ secrets.JIRA_TOKEN }}
          jira_base_url: inversocloud.atlassian.net
          jira_project: IDNA
          jira_issue_filter: 'component = "BDAG-SCHADEN"'
          github_api_token: ${{ secrets.GITHUB_TOKEN }}
          github_org: inverso-dna
          github_repo: lab-bdschad-snowflake
```

### Local Testing

1. Install dependencies and build the Action: `npm install && npm run build && npm run package`
2. Fill in the missing API tokens in `run-local.test.ts`.
3. Run the Action: `npx tsx run-local.test.ts`
