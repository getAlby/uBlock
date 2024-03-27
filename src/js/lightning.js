/*******************************************************************************

    uBlock Origin - a comprehensive, efficient content blocker
    Copyright (C) 2014-2018 Raymond Hill

    This program is free software: you can redistribute it and/or modify
    it under the terms of the GNU General Public License as published by
    the Free Software Foundation, either version 3 of the License, or
    (at your option) any later version.

    This program is distributed in the hope that it will be useful,
    but WITHOUT ANY WARRANTY; without even the implied warranty of
    MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
    GNU General Public License for more details.

    You should have received a copy of the GNU General Public License
    along with this program.  If not, see {http://www.gnu.org/licenses/}.

    Home: https://github.com/gorhill/uBlock
*/

'use strict';

import { dom } from './dom.js';
import {onConnected} from './bitcoin-connect/bitcoin-connect@3.2.2.js';
onConnected((provider) => {
    console.log('Connected with provider', provider);
});


/******************************************************************************/

const messaging = vAPI.messaging;

/******************************************************************************/

async function renderEnabledDomains() {
    const details = await messaging.send('dashboard', {
        what: 'getEnabledDomains',
    });

    details.enabledDomains.sort((a, b) => {
        return a.localeCompare(b);
    });
  
    const enabledDomains = document.querySelector('#enabledDomains');
    enabledDomains.textContent = '';
    details.enabledDomains.forEach((domain) => {
        const enabledDomainElem = dom.clone('#templates .enabledDomain');
        enabledDomainElem.querySelector('.enabled-domain-text').textContent = domain;
        const removeButton = enabledDomainElem.querySelector('.remove-enabled-domain-button');
        removeButton.dataset.domain = domain;
        dom.on(removeButton, 'click', (e) => {
          removeEnableDomain(e.target.dataset.domain);
        });
        enabledDomains.appendChild(enabledDomainElem);
    });
}

/******************************************************************************/

async function removeEnableDomain(domain) {
    await messaging.send('dashboard', {
        what: 'removeEnabledDomain',
        domain,
    });
    renderEnabledDomains();
}

/******************************************************************************/

self.wikilink = 'https://github.com/gorhill/uBlock/wiki/Dashboard:-Lightning';

/******************************************************************************/

renderEnabledDomains();

/******************************************************************************/
