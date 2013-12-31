"use strict";

var PhantomFB = require('./models/phantomFB');
var fs        = require('fs');

var ofInterest = ['array of fb user id e.g user.name.number'];

var Crawler = {
   phantom: null,      // Phantom module
   ph     : null,      // Phantom handle
   page   : null,      // Phantom page
   prof   : null,      // User profile to search
   login  : null,      // Account login
   pwd    : null,      // Account passwd

    /**
     * Constructor
     * @param profile
     */
   init: function(profile) {
       this.phantom = Object.create(PhantomFB).init();
       this.prof    = profile;
       this.login   = "fb user login";
       this.pwd     = "fb pwd";

       this.listen();

       this.phantom.initPhantom();
   },

    /**
     * Listen for phantom events
     */
   listen: function() {
       var self = this;

       // Init
       this.phantom.on('hookup', function phantomHookup(data){
           console.log("OK");
           self.ph   = data.ph;
           self.page = data.page;

           self.phantom.open(self.page, self.prof);
       });

       // Page opened
       this.phantom.on('pageOpened', function pageOpened(status){
           console.log("Status", status);
           self.phantom.authenticate(self.page, self.login, self.pwd);
       });

       // Auhenticated
       this.phantom.on('authenticated', function(){
           self.phantom.getPage(self.page);
       });

       // NOT working effort to add scrolling for lazy load
       this.phantom.on('hasPage', function(status){
           setTimeout(function() {
               self.phantom.pullPage(self.page);
           }, 5000);
       });

       // Pull the page and save it
       this.phantom.on('pagePulled', function(html){
           var filename = self.prof.length > 0 ? self.prof : 'landing';

           fs.writeFile("/tmp/" + filename + ".html", html, function(err) {
               if(err) {
                   console.log(err);
               } else {
                   console.log("The file was saved!");
               }
           });

           self.phantom.exit(self.ph);
       });

       // Catch errors
       this.phantom.on('error', function phantomError(error){
           console.log(error);
       });
   }
};

// Every N secs pull the next profile
setInterval (function() {
    if(ofInterest.length > 0) {
       var crawler = Object.create(Crawler).init(ofInterest.shift());
    }
    else{
        process.exit();
    }
}, 10000);

Object.create(Crawler).init(ofInterest.shift());