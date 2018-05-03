/**
 * BPM for Discord
 * (c) 2015-2016 ByzantineFailure 
 * 
 * Settings panel
 **/

require('!style!css!./settings.css');

var BPM_utils = require('../utils.js'),
    basePanelHtml = require('raw!./html/base-panel.html'),
    emotes = require('./emotes.js'),
    general = require('./general.js'),
    subreddits = require('./subreddits.js'),
    search = require('./search.js'),
    updates = require('./updates.js'),
    about = require('./about.js');

//Maps subpanel requests to their corresponding init/teardown objects
var subpanelMap = {
    insert_general_settings: general,
    insert_emote_settings: emotes,
    insert_subreddit_settings: subreddits,
    insert_search_settings: search,
    insert_updates: updates,
    insert_about: about
};

function injectBpmSettingsPanel(settingsButton) {
    function addTabElement(tabBar) {
        var tabElement = document.createElement('div');
        tabElement.className = 'tab-bar-item';
        tabElement.innerHTML = 'BPM';
        tabElement.id = 'bpm-settings-tab-item';
        tabBar.appendChild(tabElement);
    }

    function addTabAndListeners(tabBar) {
        addTabElement(tabBar);
        var items = document.getElementsByClassName('tab-bar-item');
        Array.prototype.forEach.call(items, function(item) {
            item.addEventListener('click', function() { 
                focusTabElement(item); 
                showSettings(item.id == 'bpm-settings-tab-item');
            }, false);
        });
    }

    settingsButton.addEventListener('click', function() {
        BPM_utils.waitForElementByClass('tab-bar SIDE', addTabAndListeners);
        BPM_utils.waitForElementByClass('settings-inner', injectSettingsPage);
    });
}

function injectSettingsPage(injectInto) {
    if(document.getElementById('bpm-settings-panel')) return;
    
    var toInject = document.createElement('div');
    toInject.className = 'scroller-wrap';
    toInject.id = 'bpm-settings-panel';
    toInject.style.display = 'none';
    toInject.innerHTML = basePanelHtml;

    injectInto.appendChild(toInject);
    
    addSubpanelSelectListeners();
}

//When we click done we should release all our listeners to avoid a memory leak
function addDoneClickListener(doneButton) {
    doneButton.addEventListener('click', function(e) {
        var settingElement = document.getElementById('bpm-settings-panel');
        if(settingElement) {
            settingElement.parent.removeChild(settingElement);
            //TODO: Also very ew
            var bpmTabs = BPM_utils.htmlCollectionToArray(document.getElementById('bpm-options-tab-list')
                                                .getElementsByClassName('tab-bar-item'));
            bpmTabs.forEach(function(tab) { tab.removeEventListener('click'); });
            var sidebarTabs = BPM_utils.htmlCollectionToArray(document.getElementsByClassName('tab-bar SIDE')[0]
                                                            .getElementsByClassName('tab-bar-item'));
            sidebarTabs.forEach(function(tab) { tab.removeEventListener('click'); });
            cleanSubpanel();
        }
        doneButton.removeEventListener('click', onDoneClick);
    });
}


//Initial setup for subpanels and their listeners
function addSubpanelSelectListeners() {
    var topTabs = document.getElementById('bpm-options-tab-list'),
        subpanelSelectors = BPM_utils.htmlCollectionToArray(topTabs.getElementsByTagName('div'));
    
    //TODO: WTF, ew
    var selected = subpanelSelectors.filter(function(selector) { 
        return selector.className.indexOf('selected') > -1; 
    })[0] || subpanelSelectors[0];
    
    selectSubpanel(selected, false);

    subpanelSelectors.forEach(function(selector) {
        selector.addEventListener('click', function() { selectSubpanel(selector, true); }); 
    });
}

//Clean listeners off of a subpanel
function cleanSubpanel() {
    var topTabs = document.getElementById('bpm-options-tab-list');
    var subpanelSelectors = BPM_utils.htmlCollectionToArray(topTabs.getElementsByTagName('div'));
    var selected = subpanelSelectors.filter(function(element) { return element.className.indexOf('selected') > -1; })[0];
    if(!selected) {
        console.log('BPM: called cleanSubpanel but could not find selected subpanel');
        return;
    }
    
    var content = document.getElementById('bpm-settings-subpanel');
    if(!content) {
        console.log('BPM: called cleanSubpanel without a subpanel present!');
            return;
    }

    var subpanel = getSubpanelFunctions(selected);
    subpanel.teardown(content);
}

function getSubpanelFunctions(selector) {
    return subpanelMap[selector.getAttribute('data-bpmSubpanelMessage')];
}

function selectSubpanel(selector, performTeardown) {
    var subpanelSelectors = BPM_utils.htmlCollectionToArray(selector.parentElement.getElementsByTagName('div')),
        injectTarget = document.getElementById('bpm-options-inject-target'),
        subpanel = getSubpanelFunctions(selector);

    if(performTeardown) {
        cleanSubpanel();
    }
    while(injectTarget.lastChild) {
        injectTarget.removeChild(injectTarget.lastChild);
    }

    var content = document.createElement('div');
    content.id = 'bpm-settings-subpanel';
    content.innerHTML = subpanel.html;
    injectTarget.appendChild(content);

    focusTabElement(selector);

    subpanel.init(content);
}

function focusTabElement(element) {
    var settingsItems = element.parentElement.getElementsByClassName('tab-bar-item');
    Array.prototype.forEach.call(settingsItems, function(item) {
        item.className = 'tab-bar-item';
    });
    element.className += ' selected';
}

function showSettings(display) {
    var settingsInner = document.getElementsByClassName('settings-inner')[0];
    if(!settingsInner) {
        console.log('BPM: Called showSettings when settingsInner does not exist!');
        return;
    }
    BPM_utils.waitForElementById('bpm-settings-panel', toggleSettingsDisplay);
    function toggleSettingsDisplay(settings) {
        if(display) {
            settingsInner.firstChild.style.display = 'none';
            settings.style.display = 'flex';
        } else {
            settingsInner.firstChild.style.display = 'flex';
            settings.style.display = 'none';
        } 
    }
}

BPM_utils.waitForElementByClass('btn btn-settings', injectBpmSettingsPanel);

