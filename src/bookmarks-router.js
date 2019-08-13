const express = require('express')
const logger = require('./logger')
const { isWebUri } = require('valid-url')
const xss = require('xss')
const BookmarksService = require('./bookmarks-service')

const bookmarksRouter = express.Router()
const bodyParser = express.json()

const sanitizeBookmark = bookmark => ({
    id: bookmark.id,
    title: xss(bookmark.title),
    url: xss(bookmark.url),
    rating: xss(bookmark.rating),
    description: xss(bookmark.description)
})

bookmarksRouter
    .route('/bookmarks')
    .get((req, res, next) => {
        const knexInstance = req.app.get('db')
        BookmarksService.getAllBookmarks(knexInstance)
            .then(allBookmarks => {
                res.json(allBookmarks.map(sanitizeBookmark))
            })
            .catch(next)
    })
    .post(bodyParser, (req, res, next) => {
        const { title, url, rating, description } = req.body;
        const newBookmark = {title, url, rating, description}
        const knexInstance = req.app.get('db')

        for (const [key, value] of Object.entries(newBookmark)) {
            if(value == null) {
                logger.error(`${key} required`)
                return res.status(400).json({
                    error: { message: `Missing ${key} in request`}
                })
            }
        }

        const ratingNum = parseInt(rating)
        if(!Number.isInteger(ratingNum) || ratingNum < 0 || ratingNum > 5) {
            logger.error(`Invalid rating of ${ratingNum} supplied`);
            return res.status(400).send('Rating must be a number between 0 and 5')
        }
        if(!isWebUri(url)) {
            logger.error(`Invalid url ${url} supplied`);
            return res.status(400).send('Must be a valid url')
        }

        BookmarksService.insertBookmark(knexInstance, newBookmark)
            .then(bookmark => {
                logger.info(`Bookmark with ID ${bookmark.id} created`)
                res
                    .status(201)
                    .location(`/bookmarks/${bookmark.id}`)
                    .json(sanitizeBookmark(bookmark))
            })
            .catch(next)
    })

bookmarksRouter
    .route('/bookmarks/:id')
    .all((req, res, next) => {
        const knexInstance = req.app.get('db')
        BookmarksService.getById(knexInstance, req.params.id)
            .then(bookmark => {
                if(!bookmark) {
                    logger.error(`Bookmark with id ${req.params.id} not found`)
                    return res.status(404).json({
                        error: {message: 'Bookmark does not exist'}
                    })
                }
                res.bookmark = bookmark
                next()
            })
    })
    .get((req, res) => {
        res.json(sanitizeBookmark(res.bookmark))
    })
    .delete((req, res, next) => {
        BookmarksService.deleteBookmark(req.app.get('db'), req.params.id)
            .then(() => {
                logger.info(`Bookmark with id ${req.params.id} deleted`)
                res.status(204).end()
            })
            .catch(next)
    })

module.exports = bookmarksRouter