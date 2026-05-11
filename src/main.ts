import * as core from '@actions/core'
import * as github from '@actions/github'
import { Endpoints } from '@octokit/types'
import {
  JIRA_EMAIL, JIRA_API_TOKEN, JIRA_BASE_URL, JIRA_PROJECT, JIRA_ISSUE_FILTER,
  GITHUB_API_TOKEN, GITHUB_ORG, GITHUB_REPO,
  DRY_RUN
} from './env'
import {Project} from './api'
import {Version} from './models'

function isoDateToJiraDate(iso_date: string, strip_time: boolean): string {
  // GitHub gives us timestamps in ISO 8601 format, JIRA expects its own custom format.
  // JS does not have any native support for date formatting, so we have to roll our own.
  const date = new Date(iso_date)
  const month_pad = (date.getMonth() + 1).toString().padStart(2, "0")
  const day_pad = date.getDate().toString().padStart(2, "0")
  if (strip_time) {
    return `${date.getFullYear()}-${month_pad}-${day_pad}`
  }
  const hours_pad = date.getHours().toString().padStart(2, "0")
  const minutes_pad = date.getMinutes().toString().padStart(2, "0")
  return `${date.getFullYear()}-${month_pad}-${day_pad} ${hours_pad}:${minutes_pad}`
}

async function run(): Promise<void> {
  try {
    // Fetch releases from GitHub, filter out drafts and prereleases, sort by date.
    const git = github.getOctokit(GITHUB_API_TOKEN)
    type listReleasesResponse = Endpoints["GET /repos/{owner}/{repo}/releases"]["response"]
    let public_releases: listReleasesResponse["data"] = []
    const release_iter = git.paginate.iterator(git.rest.repos.listReleases, {owner: GITHUB_ORG, repo: GITHUB_REPO})
    for await (const { data: releases } of release_iter) {
      for (const release of releases) {
        if (!release.draft && !release.prerelease && !!release.name && !!release.published_at) {
          public_releases.push(release)
        }
      }
    }
    public_releases.sort((a, b) => a.published_at!.localeCompare(b.published_at!))

    // Check if release ("Version") exists in JIRA. If not, create the release and assign all relevant issues.
    // Do not touch existing releases.
    const jira_project = await Project.create(JIRA_EMAIL, JIRA_API_TOKEN, JIRA_PROJECT, JIRA_BASE_URL)
    core.debug(`JIRA project loaded: ${jira_project.project?.id}`)

    let prev_release = null
    for (const release of public_releases) {
      let version = jira_project.getVersion(release.name!)
      if (version === undefined) {
        core.debug(`Version ${release.name} not found`)

        const versionToCreate: Version = {
          name: release.name!,
          archived: false,
          released: true,
          releaseDate: isoDateToJiraDate(release.published_at!, true),
          projectId: Number(jira_project.project?.id),
          description: `${release.body ?? ""}\n\nGitHub: ${release.url ?? "-"}`
        }
        core.debug(JSON.stringify(versionToCreate))
        if (DRY_RUN !== 'true') {
          version = await jira_project.createVersion(versionToCreate)
        } else {
          core.notice(`Dry run, not creating version ${release.name}.`)
          version = versionToCreate
        }

        let query = `project IN (${JIRA_PROJECT}) AND fixVersion = EMPTY`
        if (JIRA_ISSUE_FILTER) {
          query += ` AND ${JIRA_ISSUE_FILTER}`
        }
        if (prev_release) {
          query += ` AND resolved > "${isoDateToJiraDate(prev_release.published_at!, false)}"`
        }
        query += ` AND resolved < "${isoDateToJiraDate(release.published_at!, false)}"`
        core.debug(query)

        const issues = await jira_project.searchIssues(query)
        for (const issue of issues) {
          if (version?.id !== undefined) {
            jira_project.updateIssue(issue, version.id)
          } else {
            core.notice(`Dry run, not updating issue ${issue}.`)
          }
        }

        prev_release = release
      }
    }
  } catch (e: any) {
    core.setFailed(e)
  }
}

run()
