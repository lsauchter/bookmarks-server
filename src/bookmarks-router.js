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
                res.json(allBookmarks)
            })
            .catch(next)
    })
    .post(bodyParser, (req, res) => {
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

        if(!Number.isInteger(rating) || rating < 0 || rating > 5) {
            logger.error(`Invalid rating of ${rating} supplied`);
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
    })

bookmarksRouter
    .route('/bookmarks/:id')
    .get((req, res) => {
        const knexInstance = req.app.get('db')
        BookmarksService.getById(knexInstance, req.params.id)
            .then(bookmark => {
                if(!bookmark) {
                    logger.error(`Bookmark with id ${req.params.id} not found`)
                    res.status(404).json({
                        error: {message: 'Bookmark does not exist'}
                    })
                }
                res.json(bookmark)
            })
    })
    .delete((req, res) => {
        const { id } = req.params;
        const bookmarkIndex = bookmarks.findIndex(bk => bk.id == id);

        if (bookmarkIndex === -1) {
            logger.error(`Bookmark with ${id} not found`);
            return res.status(404).send('Bookmark not found');
        }

        bookmarks.splice(bookmarkIndex, 1);
        logger.info(`Bookmark with id ${id} deleted`);
        res.status(204).end();
    })

module.exports = bookmarksRouter