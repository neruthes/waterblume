const myWbGameExample = {
    bpm: 60,
    keys: [
        '',
        '',
        '',
        '',
        'a',
        'd',
        'j',
        'l',

        'wi',
        'al',
        'sk',
        '',

        'w',
        'a',
        's',
        '',
        'i',
        'l',
        'k',
        '',

        'd',
        's',
        'a',
        'wi',
        'l',
        'k',
        'dj',

        'al',
        '',
        'wi',
        '',
        'k',
        'l',
        's',
        'a',

        'askl',
        '',
        'wdij',
        '',

        ''
    ]
};

let myWbGame = {};

const parseSearchParams = function () {
    let obj = {};
    let arr = location.search.slice(1).split('&').map(x => {
        let a = x.split('=');
        obj[a[0]] = a[1];
    });
    return obj;
};
