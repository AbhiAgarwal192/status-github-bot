// Description:
//   Script that listens for new Review Requests and notifies reviewers on Slack
//
// Dependencies:
//   @slack/client: ""
//
// Author:
//   Martin Klepsch (martinklepsch)

const slackHelper = require('../lib/slack')

const botName = 'notify-reviewers-via-slack'

module.exports = (robot, getSlackIdFromGitHubId) => {
  robot.log(`${botName} - Starting...`)
  registerForNewReviewRequests(robot, getSlackIdFromGitHubId)
}

function registerForNewReviewRequests (robot, getSlackIdFromGitHubId) {
  robot.on('pull_request.review_requested', async context => {
    // Make sure we don't listen to our own messages
    if (context.isBot) return null

    await notifyReviewer(context, robot, getSlackIdFromGitHubId)
  })
}

async function notifyReviewer (context, robot, getSlackIdFromGitHubId) {
  const { payload } = context
  const reviewer = payload.requested_reviewer
  const userID = getSlackIdFromGitHubId(reviewer.login)

  if (!userID) {
    robot.log.warn('Could not find Slack ID for GitHub user', reviewer.login)
    return
  }

  robot.slackWeb.im.open(userID).then(resp => {
    const dmChannelID = resp.channel.id
    const msg = `New Pull Request awaiting your review: ${payload.pull_request.html_url}`

    robot.log.info(`${botName} - Opened DM Channel ${dmChannelID}`)
    robot.log.info(`Notifying ${userID} about review request in ${payload.pull_request.url}`)

    robot.slackWeb.chat.postMessage(dmChannelID, msg, {unfurl_links: true, as_user: slackHelper.BotUserName})
  }).catch(error => robot.log.error('Could not open DM channel for review request notification', error))
}
