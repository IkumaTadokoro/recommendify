const SpotifyWebApi = require('spotify-web-api-node')
const express = require('express')
const { Form } = require('enquirer')
const Conf = require('conf')

const config = new Conf({ projectName: 'Suggestify' })

const scopes = [
  'playlist-modify-private',
  'user-read-recently-played'
]

const prompt = new Form({
  name: 'credentials',
  message: 'Please setting the following credentials:',
  choices: [
    { name: 'client_id', message: 'CLIENT_ID（required）' },
    { name: 'client_secret', message: 'CLIENT_SECRET（required）' }
  ],
  validate: (submittedItems) => {
    if (!submittedItems.client_id) {
      return 'CLIENT_IDを入力してください'
    }
    if (!submittedItems.client_secret) {
      return 'CLIENT_SECRETを入力してください'
    }
    return true
  }
})

const setToken = async () => {
  const credentials = await prompt.run()
  config.set('client_id', credentials.client_id)
  config.set('client_secret', credentials.client_secret)

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

        console.log('Sucessfully retreived access token! You can start \'Suggestify\'! with \'suggestify\' command.')

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
