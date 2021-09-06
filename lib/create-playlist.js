const SpotifyWebApi = require('spotify-web-api-node')
const { prompt } = require('enquirer')
const Conf = require('conf')

const config = new Conf({ projectName: 'Suggestify' })
const unAuthorized = 401

const today = new Date()
const formattedToday = `
${today.getFullYear()}
-${(today.getMonth() + 1).toString().padStart(2, '0')}
-${today.getDate().toString().padStart(2, '0')}
 ${today.getHours().toString().padStart(2, '0')}
:${today.getMinutes().toString().padStart(2, '0')}
:${today.getSeconds().toString().padStart(2, '0')}
`.replace(/[\n\r]/g, '')

const accessToken = config.get('access_token')
const refreshToken = config.get('refresh_token')

const spotifyApi = new SpotifyWebApi(
  {
    clientId: config.get('client_id'),
    clientSecret: config.get('client_secret')
  }
)

const createPlaylist = async () => {
  if (!accessToken && !refreshToken) {
    console.log('Access token is not retrived. You should get access token via \'suggestify settoken\' command.')
    process.exit(1)
  }

  spotifyApi.setAccessToken(accessToken)

  const description = `This playlist is created at ${formattedToday} and created by Suggestify.`
  const tracks = await getRecommendations().then(songs => selectSongsAtRandom(songs))
  const data = await callApi(spotifyApi.createPlaylist, [`${formattedToday}`, { description, public: false }])
  await callApi(spotifyApi.addTracksToPlaylist, [data.body.id, tracks])
  console.log('Created playlist!')
  console.log(`Open Spotify🎧：${data.body.external_urls.spotify}`)
}

const getRecommendations = async () => {
  const response = await prompt([
    {
      type: 'multiselect',
      name: 'songs',
      message: 'Pick your favorite songs upto 3 from You have listened recently',
      limit: 10,
      choices: getMyRecentlyPlayedTrack(),
      validate: (selectedItems) => {
        if (selectedItems.length >= 1 && selectedItems.length <= 3) {
          return true
        }
        return '3曲以内で1曲以上選んでください'
      }
    },
    {
      type: 'scale',
      name: 'valence',
      message: 'Choose valence（高い方がよりポジティブ）',
      scale: [
        { name: '0.0', message: 'Negative' },
        { name: '0.25', message: 'Little Negative' },
        { name: '0.5', message: 'Normal' },
        { name: '0.75', message: 'Little Positive' },
        { name: '1.0', message: 'Positive' }
      ],
      choices: [
        {
          name: 'valence',
          message: 'valence',
          initial: 2
        }
      ],
      result: (choice) => {
        const valenceScale = ['0.0', '0.25', '0.5', '0.75', '1.0']
        return valenceScale[choice.valence]
      }
    },
    {
      type: 'scale',
      name: 'popularity',
      message: 'Choose popularity（高い方が人気のあるアーティスト）',
      scale: [
        { name: '0', message: 'Minor' },
        { name: '25', message: 'Little Minor' },
        { name: '50', message: 'Normal' },
        { name: '75', message: 'Little Major' },
        { name: '100', message: 'Major' }
      ],
      choices: [
        {
          name: 'popularity',
          message: 'popularity',
          initial: 2
        }
      ],
      result: (choice) => {
        const popularityScale = ['0', '25', '50', '75', '100']
        return popularityScale[choice.popularity]
      }
    },
    {
      type: 'scale',
      name: 'tempo',
      message: 'Choose BPM',
      scale: [
        { name: '75', message: '' },
        { name: '100', message: '' },
        { name: '125', message: '' },
        { name: '150', message: '' },
        { name: '175', message: '' },
        { name: '200', message: '' }
      ],
      choices: [
        {
          name: 'tempo',
          message: 'tempo',
          initial: 2
        }
      ],
      result: (choice) => {
        const bpmScale = ['75', '100', '125', '150', '175', '200']
        return bpmScale[choice.tempo]
      }
    }
  ])

  const data = await callApi(spotifyApi.getRecommendations, [{
    market: 'JP',
    seed_tracks: response.songs,
    limit: 100,
    target_popularity: response.popularity,
    target_valence: response.valence,
    target_tempo: response.tempo
  }])

  return data.body.tracks.map(track => `spotify:track:${track.id}`)
}

const selectSongsAtRandom = (songs) => {
  return [...Array(15)].map(() => songs.splice(Math.floor(Math.random() * songs.length), 1)[0])
}

const getMyRecentlyPlayedTrack = async () => {
  const data = await callApi(spotifyApi.getMyRecentlyPlayedTracks, [{ limit: 50 }])
  return await data.body.items.map(item => ({
    name: item.track.id,
    message: `${item.track.artists.map(artist => artist.name).join(',')}: ${item.track.name}`
  }))
}

const refreshAccessToken = async () => {
  spotifyApi.setRefreshToken(refreshToken)
  try {
    const data = await spotifyApi.refreshAccessToken()
    config.set('access_token', data.body.access_token)
    spotifyApi.setAccessToken(data.body.access_token)
  } catch (error) {
    throw new Error(error)
  }
}

const callApi = (func, argumentArray) => {
  return (async function callSpotifyApi (retryCounter = 1) {
    try {
      return await func.apply(spotifyApi, argumentArray)
    } catch (error) {
      if (error.body.error.status === unAuthorized && retryCounter) {
        await refreshAccessToken()
        return await callSpotifyApi(retryCounter - 1)
      }
      throw new Error(error)
    }
  }())
}

module.exports = createPlaylist
