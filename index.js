#! /usr/bin/env node

const program = require('commander')
const setToken = require('./lib/set-token')
const createPlaylist = require('./lib/create-playlist')

const onFatalError = () => {
  process.exitCode = 2
  console.error('Oops! Something went wrong! :(')
}

const main = () => {
  process.on('uncaughtException', onFatalError)
  process.on('unhandledRejection', onFatalError)

  program
    .command('createPlaylist', { isDefault: true })
    .description('<Default> Create private playlist for your spotify account. Note:Require \'recommendify settoken\' command before the first time you run.')
    .action(() => createPlaylist())

  program
    .command('settoken')
    .description('Login Spotify via authorization code flow (Refer: https://developer.spotify.com/documentation/general/guides/authorization-guide/).')
    .action(() => setToken())

  program.parse()
}

main()
