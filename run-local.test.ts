import {RunOptions, RunTarget} from 'github-action-ts-run-api';

async function run() {
    const target = RunTarget.mainJs('action.yml');
    const options = RunOptions.create()
        .setGithubContext({payload: {pull_request: {number: 123}}})
        .setInputs({
            jira_email: "...@inverso.de",
            jira_api_token: "...",
            jira_base_url: "inversocloud.atlassian.net",
            jira_project: "IDNA",
            github_api_token: "...",
            github_org: "inverso-dna",
            github_repo: "...",
            dry_run: "true"
        })

    const res = await target.run(options);
    console.log(res);
}

run()
