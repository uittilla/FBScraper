"use strict";

var EventEmitter, phantom, selectors;

EventEmitter = require('events').EventEmitter;
phantom      = require('phantom');
selectors    = require('./selectors');

var Phantom = {
    __proto__  : EventEmitter.prototype,
    baseUrl    : selectors.base,

    init: function() { return this; },
    /**
     * Setup PhantomJs
     * @returns {*}
     */
    initPhantom: function() {
        var self = this;

        return phantom.create(function(ph){
            self.createPage(ph);
        });
    },

    /**
     * Follow
     * @param ph
     * @returns {*}
     */
    createPage: function(ph) {
        var self = this;
        return ph.createPage(function(page) {

            if(page) {
                self.setUp(page);
                self.emit('hookup', {'ph': ph, 'page': page});
            } else {
                self.emit('error', {'code': 100, 'message': 'Failed to create phantom instance'});
            }
        });
    },

    /**
     * Setup the page
     *
     * @param page
     */
    setUp: function(page) {

        page.set('Referer', this.engine);
        page.set('settings.userAgent', 'Mozilla/5.0 (Windows NT 6.2) AppleWebKit/535.11 (KHTML, like Gecko) Chrome/17.0.963.12 Safari/535.11');
        page.set('settings.javascriptEnabled', true);
        page.set('settings.loadImages', true);
        page.set('cookiesFile', '/tmp/cookies.txt');
        page.set('viewportSize', { width: 1366, height: 525000 });

        page.set('onConsoleMessage', function (msg) {
            console.log("Message", msg);
        });

        page.set('onError', function (msg, trace)  {
           // console.log(msg, trace);
        });

        page.set('onResourceRequested', function (request) {
           // console.log('Request ' + JSON.stringify(request, undefined, 4));
        });
    },

    /**
     * Open the page
     *
     * @param page
     */
    open: function(page, link) {
        var self = this;

        console.log("Opening", this.baseUrl + link);

        // You can append things like /photos etc to the link

        page.open(this.baseUrl + link, function(status) {
            if(status == "success") {
               self.emit('pageOpened', status);
            } else {
               self.emit('error', {'code': 200, 'message': 'page open failure'});
            }
        });
    },

    /**
     * Login to FB
     * @param page
     * @param username
     * @param password
     * @returns {Object}
     */
    authenticate: function(page, username, password) {
        var self = this;

        return page.evaluate(function(username, password, selectors) {

            // Check for the login fields
            if(document.getElementById(selectors.login) && document.getElementById(selectors.password)) {
                document.getElementById('email').value = username;
                document.getElementById('pass').value  = password;
                // submit
                if(document.forms[0]) {
                    console.log("Form found");
                    var forms   = document.forms[0];
                    var newForm = document.createElement('form');
                    newForm.submit.apply(forms);
                    return true;
                }

                return true;
            }

            // Check if we are already logged in
            if(document.getElementsByClassName(selectors.loggedIn)[0]) {
                console.log("Found", document.getElementsByClassName(selectors.loggedIn)[0].innerHTML);
                return true;
            }

            // Fail
            return false;
        },
        function result(result) {
            if(result) {
                self.emit('authenticated');
            }
            else {
                self.emit('error', 'unable to submit the form');
            }
        },username, password, selectors);
    },

    /**
     * Get the page, try adding some scrolling in here for FB lazy load
     * Otherwise you just get he 1st set of results
     * @param page
     */
    getPage: function(page) {
        var self = this;

        page.evaluate(function(page, phantom) {
            if(document.getElementsByTagName('html')) {
                console.log("Height", document.body.scrollTop);

                return {
                    success: true
                }
            }
            else {
               return {
                   success: false
               };
            }
        },
        function result(result) {

            if(result.success) {
                self.emit('hasPage', result.success)
            }
            else {
                self.emit('error', 'unable to get the page');
            }
        }, page, phantom);
    },

    /**
     * Finally return the page contents for saving / analysis
     * @param page
     */
    pullPage: function(page) {
        var self = this;

        page.evaluate(function() {

            if(document.getElementsByTagName('html')) {
                return document.getElementsByTagName('html')[0].innerHTML;
            }

            return false;
        },

        function(result) {
            if(result) {
                self.emit('pagePulled', result)
            }
            else {
                self.emit('error', 'unable to pull the page');
            }
        });
    },

    /**
     * Kill Phantom
     * @param ph
     */
    exit: function(ph) {
        ph.exit(ph);
    }
};

module.exports = Phantom;