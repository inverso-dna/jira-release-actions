import * as core from '@actions/core'
import axios, {AxiosError} from 'axios'
import {Version, ProjectDTO} from './models'

export class Project {
  email: string
  token: string
  name: string
  base_url: string

  project?: ProjectDTO

  constructor(email: string, token: string, name: string, base_url: string) {
    this.email = email
    this.token = token
    this.name = name
    this.base_url = base_url
  }

  getVersion(rel: string): Version | undefined {
    if (this.project === undefined) return undefined
    else {
      const result = this.project.versions?.filter(i => i.name === rel)
      if (result === undefined) return undefined
      if (result.length === 0) {
        return undefined
      } else return result[0]
    }
  }

  async createVersion(version: Version): Promise<Version> {
    try {
      const response = await axios.post(
        `https://${this.base_url}/rest/api/3/version`,
        version,
        this._authHeaders()
      )
      return response?.data
    } catch (error: unknown) {
      return Promise.reject(toMoreDescriptiveError(error))
    }
  }

  async updateVersion(version: Version): Promise<Version> {
    try {
      core.debug(JSON.stringify(version))
      const response = await axios.put(
        `https://${this.base_url}/rest/api/3/version/${version.id}`,
        version,
        this._authHeaders()
      )
      return response?.data
    } catch (error: unknown) {
      return Promise.reject(toMoreDescriptiveError(error))
    }
  }

  async searchIssues(jql: string) {
    try {
      let issue_ids = []
      let page_token = null
      while (true) {
        const response: any = await axios.post(
          `https://${this.base_url}/rest/api/3/search/jql`,
          {
            jql: jql,
            nextPageToken: page_token
          },
          this._authHeaders()
        )
        for (const issue of response.data.issues) {
          issue_ids.push(issue.id)
        }
        if (response.data.isLast) {
          break
        }
        page_token = response.data.nextPageToken
      }
      return issue_ids
    } catch (error: unknown) {
      return Promise.reject(toMoreDescriptiveError(error))
    }
  }

  // eslint-disable-next-line @typescript-eslint/explicit-function-return-type
  async updateIssue(ticket: string, version: string) {
    try {
      const response = await axios.put(
        `https://${this.base_url}/rest/api/3/issue/${ticket}`,
        {
          update: {
            fixVersions: [
              {
                add: {id: version}
              }
            ]
          }
        },
        this._authHeaders()
      )
      return response?.data
    } catch (error: unknown) {
      return Promise.reject(toMoreDescriptiveError(error))
    }
  }

  static async create(
    email: string,
    token: string,
    name: string,
    domain: string
  ): Promise<Project> {
    const result = new Project(email, token, name, domain)
    return result._load()
  }

  async _load(): Promise<Project> {
    try {
      const response = await axios.get(
        `https://${this.base_url}/rest/api/3/project/${this.name}?properties=versions,key,id,name`,
        this._authHeaders()
      )
      this.project = response?.data
      return this
    } catch (error: unknown) {
      return Promise.reject(toMoreDescriptiveError(error))
    }
  }

  _authHeaders(): Object {
    return {
      headers: {
        Authorization: `Basic ${Buffer.from(
          `${this.email}:${this.token}`
        ).toString('base64')}`,
        Accept: 'application/json'
      }
    }
  }
}

const toMoreDescriptiveError = (error: unknown): Error | unknown => {
  if (error instanceof AxiosError) {
    const e : AxiosError = error
    let msg = `${e.request?.method} ${e.response?.config.url} ${e.response?.status}`
    const data : any = e.response?.data
    if (Array.isArray(data.errorMessages)) {
      msg += ` - ${data.errorMessages[0]}`
    }
    return new Error(msg)
  } else {
    core.debug(`error: ${error}`)
    return error
  }
}
