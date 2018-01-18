// Description:
//   Script that keeps GitHub-related context to be shared among scripts
//
// Dependencies:
//   github: "^13.1.0"
//
// Author:
//   PombeirP

const GitHubApi = require('github');

let cachedRobotNameRegex;
let initialized = false;
const githubAPI = new GitHubApi({
  timeout: 15000,
  requestMedia: 'application/vnd.github.v3+json'
});

module.exports = {

  github() { return githubAPI; },

  initialize(robot, integrationID) {
    if (initialized) { return; }

    const token = robot.brain.get('github-token');
    if (token) {
      initialized = true;
      process.env.HUBOT_GITHUB_TOKEN = token;
      robot.logger.debug("Reused cached GitHub token");
      githubAPI.authenticate({ type: 'token', token });
      return;
    }

    const pemFilePath = './status-github-bot.pem';

    const jwtLib = require('jwt-simple');

    // Private key contents
    let privateKey = '';
    try {
      const fs = require('fs');
      privateKey = fs.readFileSync(pemFilePath);
    } catch (err) {
      robot.logger.error(`Couldn't read ${pemFilePath} file contents: ${err}`);
      return;
    }

    const now = Math.round(Date.now() / 1000);
    // Generate the JWT
    const payload = {
      // issued at time
      iat: now,
      // JWT expiration time (10 minute maximum)
      exp: now + (1 * 60),
      // GitHub App's identifier
      iss: integrationID
    };

    jwt = jwtLib.encode(payload, privateKey, 'RS256');
    githubAPI.authenticate({
      type: 'integration',
      token: jwt
    });
    robot.logger.debug("Configured integration authentication with JWT", jwt);

    initialized = true;
  },

  equalsRobotName(robot, str) {
    return getRegexForRobotName(robot).test(str);
  }
};

function getRegexForRobotName(robot) {
  // This comes straight out of Hubot's Robot.coffee
  // - they didn't get a nice way of extracting that method though
  if (!cachedRobotNameRegex) {
    let namePattern;
    const name = robot.name.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&');

    if (robot.alias) {
      const alias = robot.alias.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&');
      namePattern = `^\\s*[@]?(?:${alias}|${name})`;
    } else {
      namePattern = `^\\s*[@]?${name}`;
    }
    cachedRobotNameRegex = new RegExp(namePattern, 'i');
  }
  return cachedRobotNameRegex;
};
