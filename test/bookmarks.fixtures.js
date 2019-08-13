function makeBookmarksArray() {
    return [
        {
            id: 1,
            title: 'First test',
            url: 'first test url',
            description: 'first test',
            rating: '2'
        },
        {
            id: 2,
            title: 'Second test',
            url: 'second test url',
            description: 'second test',
            rating: '3'
        },
        {
            id: 3,
            title: 'Third test',
            url: 'third test url',
            description: 'third test',
            rating: '4'
        }
    ]
}

function makeMaliciousBookmark() {
    const maliciousBookmark = {
        id: 911,
        title: 'Bad things <script>alert("xss");</script>',
        url: 'https://badurl.com',
        description: 'Bad image <img src="https://url.to.file.does.not.exist" onerror="alert(document.cookie);"> Not all <strong>bad</strong>',
        rating: '2'
    }
    const expectedBookmark = {
        ...maliciousBookmark,
        title: 'Bad things &lt;script&gt;alert(\"xss\");&lt;/script&gt;',
        description: 'Bad image <img src="https://url.to.file.does.not.exist"> Not all <strong>bad</strong>'
    }
    return {
        maliciousBookmark,
        expectedBookmark
    }
}

module.exports = {
    makeBookmarksArray, 
    makeMaliciousBookmark
}