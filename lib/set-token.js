const SpotifyWebApi = require('spotify-web-api-node')
const express = require('express')
const { Form } = require('enquirer')
const Conf = require('conf')

const config = new Conf({ projectName: 'Recommendify' })

const scopes = [
  'playlist-modify-private',
  'user-read-recently-played'
]

const clientIdPrompt = new Form({
  name: 'credentials',
  message: 'Please setting your client_id:',
  choices: [
    { name: 'client_id', message: 'CLIENT_ID（required）' },
  ],
  validate: (submittedItems) => {
    if (!submittedItems.client_id) {
      return 'CLIENT_IDを入力してください'
    }
    return true
  }
})

const clientSecretPrompt = new Form({
  name: 'credentials',
  message: 'Please setting your client_secret:',
  choices: [
    { name: 'client_secret', message: 'CLIENT_SECRET（required）' }
  ],
  validate: (submittedItems) => {
    if (!submittedItems.client_secret) {
      return 'CLIENT_SECRETを入力してください'
    }
    return true
  }
})

const setToken = async () => {
  const clientIdAnswer = await clientIdPrompt.run()
  const clientSecretAnswer = await clientSecretPrompt.run()
  config.set('client_id', clientIdAnswer.client_id)
  config.set('client_secret', clientSecretAnswer.client_secret)

  const spotifyApi = new SpotifyWebApi({
    clientId: config.get('client_id'),
    clientSecret: config.get('client_secret'),
    redirectUri: 'http://localhost:8888/callback'
  })

  const app = express()

  app.get('/login', (req, res) => {
    res.redirect(spotifyApi.createAuthorizeURL(scopes))
  })

  app.get('/callback', (req, res) => {
    const error = req.query.error
    const code = req.query.code

    if (error) {
      console.error('Callback Error:', error)
      res.send(`Callback Error: ${error}`)
      return
    }

    spotifyApi
      .authorizationCodeGrant(code)
      .then(data => {
        const accessToken = data.body.access_token
        const refreshToken = data.body.refresh_token

        config.set('access_token', accessToken)
        config.set('refresh_token', refreshToken)

        res.send('Success! You can now close the window.')

        console.log('Sucessfully retreived access token! You can start \'Recommendify\'! with \'recommendify\' command.')

        server.close()
        process.exit(0)
      })
  })

  const server = app.listen(8888, () =>
    console.log(
      'HTTP Server up. Now go to http://localhost:8888/login in your browser.'
    )
  )
}

module.exports = setToken
