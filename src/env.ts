import * as core from '@actions/core'

export const JIRA_EMAIL: string = core.getInput('jira_email', {required: true})
export const JIRA_API_TOKEN: string = core.getInput('jira_api_token', {required: true})
export const JIRA_BASE_URL: string = core.getInput('jira_base_url', {required: true})
export const JIRA_PROJECT: string = core.getInput('jira_project', {required: true})
export const JIRA_ISSUE_FILTER: string = core.getInput('jira_issue_filter', {required: false})
export const JIRA_VERSION_PREFIX: string = core.getInput('jira_version_prefix', {required: false})

export const GITHUB_API_TOKEN: string = core.getInput('github_api_token', {required: true})
export const GITHUB_ORG: string = core.getInput('github_org', {required: true})
export const GITHUB_REPO: string = core.getInput('github_repo', {required: true})

export const DRY_RUN: string = core.getInput('dry_run', {required: false})
