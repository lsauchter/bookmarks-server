const express = require('express')
const uuid = require('uuid/v4')
const logger = require('./logger')
const { isWebUri } = require('valid-url')
const { bookmarks } = require('./store')
const BookmarksService = require('./bookmarks-service')

const bookmarksRouter = express.Router()
const bodyParser = express.json()

bookmarksRouter
    .route('/bookmarks')
    .get((req, res) => {
        const knexInstance = req.app.get('db')
        BookmarksService.getAllBookmarks(knexInstance)
            .then(allBookmarks => {
                res.json(allBookmarks)
            })
    })
    .post(bodyParser, (req, res) => {
        const { title, url, rating, description } = req.body;

        if(!title) {
            logger.error('Title required');
            return res.status(400).send('Title required')
        }
        if(!url) {
            logger.error('URL required');
            return res.status(400).send('URL required')
        }
        if(!rating) {
            logger.error('Rating required');
            return res.status(400).send('Rating required')
        }
        if(!description) {
            logger.error('Description required');
            return res.status(400).send('Description required')
        }

        if(!Number.isInteger(rating) || rating < 0 || rating > 5) {
            logger.error(`Invalid rating of ${rating} supplied`);
            return res.status(400).send('Rating must be a number between 0 and 5')
        }
        if(!isWebUri(url)) {
            logger.error(`Invalid url ${url} supplied`);
            return res.status(400).send('Must be a valid url')
        }

        const id = uuid();

        const bookmark = {
            id,
            title,
            url,
            rating,
            description
        }

        bookmarks.push(bookmark);
        logger.info(`Bookmark with is ${id} created`)
        res.status(201).location(`http://localhost:8000/bookmarks/${id}`).json(bookmark)
    })

bookmarksRouter
    .route('/bookmarks/:id')
    .get((req, res) => {
        const knexInstance = req.app.get('db')
        BookmarksService.getById(knexInstance, req.params.id)
            .then(bookmark => {
                if(!bookmark) {
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