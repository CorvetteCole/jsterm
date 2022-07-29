// Copyright 2013 Clark DuVall
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//     http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

import { email_access_key} from "../js/secrets";

var COMMANDS = COMMANDS || {};

let sudo_ran = false;

COMMANDS.cat = function (argv, cb) {
    let filenames = this._terminal.parseArgs(argv).filenames,
        stdout;

    this._terminal.scroll();
    if (!filenames.length) {
        this._terminal.returnHandler = function () {
            stdout = this.stdout();
            if (!stdout)
                return;
            stdout.innerHTML += '<br>' + stdout.innerHTML + '<br>';
            this.scroll();
            this.newStdout();
        }.bind(this._terminal);
        return;
    }
    filenames.forEach(function (filename, i) {
        const entry = this._terminal.getEntry(filename);

        if (!entry)
            this._terminal.write('cat: ' + filename + ': No such file or directory');
        else if (entry.type === 'dir')
            this._terminal.write('cat: ' + filename + ': Is a directory.');
        else
            this._terminal.write(entry.contents);
        if (i !== filenames.length - 1)
            this._terminal.write('<br>');
    }, this);
    cb();
}

COMMANDS.cd = function (argv, cb) {
    let filename = this._terminal.parseArgs(argv).filenames[0],
        entry;

    if (!filename)
        filename = '~';
    entry = this._terminal.getEntry(filename);
    if (!entry)
        this._terminal.write('bash: cd: ' + filename + ': No such file or directory');
    else if (entry.type !== 'dir')
        this._terminal.write('bash: cd: ' + filename + ': Not a directory.');
    else
        this._terminal.cwd = entry;
    cb();
}

COMMANDS.ls = function (argv, cb) {
    let result = this._terminal.parseArgs(argv),
        args = result.args,
        filename = result.filenames[0],
        entry = filename ? this._terminal.getEntry(filename) : this._terminal.cwd,
        maxLen = 0,
        writeEntry;

    writeEntry = function (e, str) {
        this.writeLink(e, str);
        if (args.indexOf('l') > -1) {
            if ('description' in e)
                this.write(' - ' + e.description);
            this.write('<br>');
        } else {
            // Make all entries the same width like real ls. End with a normal
            // space so the line breaks only after entries.
            this.write(Array(maxLen - e.name.length + 2).join('&nbsp') + ' ');
        }
    }.bind(this._terminal);

    if (!entry)
        this._terminal.write('ls: cannot access ' + filename + ': No such file or directory');
    else if (entry.type === 'dir') {
        const dirStr = this._terminal.dirString(entry);
        maxLen = entry.contents.reduce(function (prev, cur) {
            return Math.max(prev, cur.name.length);
        }, 0);

        for (const i in entry.contents) {
            const e = entry.contents[i];
            if (args.indexOf('a') > -1 || e.name[0] !== '.')
                writeEntry(e, dirStr + '/' + e.name);
        }
    } else {
        maxLen = entry.name.length;
        writeEntry(entry, filename);
    }
    cb();
}

COMMANDS.gimp = function (argv, cb) {
    let filename = this._terminal.parseArgs(argv).filenames[0],
        entry,
        imgs;

    if (!filename) {
        this._terminal.write('gimp: please specify an image file.');
        cb();
        return;
    }

    entry = this._terminal.getEntry(filename);
    if (!entry || entry.type !== 'img') {
        this._terminal.write('gimp: file ' + filename + ' is not an image file.');
    } else {
        this._terminal.write('<img src="' + entry.contents + '" alt=""/>');
        imgs = this._terminal.div.getElementsByTagName('img');
        imgs[imgs.length - 1].onload = function () {
            this.scroll();
        }.bind(this._terminal);
        if ('caption' in entry)
            this._terminal.write('<br/>' + entry.caption);
    }
    cb();
}

COMMANDS.clear = function (argv, cb) {
    this._terminal.div.innerHTML = '';
    cb();
}

COMMANDS.sudo = function (argv, cb) {
    this._terminal.returnHandler = function () {
        this.write('</br>' + this.config.username + ' is not in the sudoers file. <a href="https://xkcd.com/838/" target="_blank">This incident will be reported.</a>');
        cb();
    }.bind(this._terminal);

    if (!sudo_ran) {
        this._terminal.write('We trust you have received the usual lecture from the local System Administrator. It usually boils down to these three things:<br/>');
        this._terminal.write('<br/>');
        this._terminal.write('    #1) Respect the privacy of others.<br/>');
        this._terminal.write('    #2) Think before you type.<br/>');
        this._terminal.write('    #3) With great power comes great responsibility.<br/>');
        this._terminal.write('<br/>');
        sudo_ran = true;
    }

    this._terminal.write('[sudo] password for ' + this._terminal.config.username + ': ');
    this._terminal.scroll();
}

COMMANDS.login = function (argv, cb) {
    this._terminal.returnHandler = function () {
        const username = this.stdout().innerHTML;
        this.scroll();
        if (username)
            this.config.username = username;
        this.write('<br>Password: ');
        this.scroll();
        this.returnHandler = function () {
            cb();
        }
    }.bind(this._terminal);
    this._terminal.write('Username: ');
    this._terminal.newStdout();
    this._terminal.scroll();
}

COMMANDS.contact = function (argv, cb) {
    let contactData = {
        subject: "New Submission from corvettecole.com",
        access_key: email_access_key,
        email: '',
        name: '',
        message: ''
    };

    this._terminal.returnHandler = function () {
        if (!contactData.email) {
            contactData.email = this.stdout().innerHTML;
        } else if (!contactData.name) {
            contactData.name = this.stdout().innerHTML;
        } else if (!contactData.message) {
            contactData.message = this.stdout().innerHTML;
        }
        this.scroll();

        // do the same thing over, but now we are printing
        if (!contactData.email) {
            this.write('<br>Enter your email: ');
        } else if (!contactData.name) {
            this.write('<br>Enter your name: ');
        } else if (!contactData.message) {
            this.write('<br>Enter your message: ');
        }
        this.newStdout();
        this.scroll();

        if (contactData.email && contactData.name && contactData.message) {
            // send the email
            console.log(contactData);

            this.write('<br>Sending...');
            this.scroll();

            fetch('https://api.web3forms.com/submit', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                },
                body: JSON.stringify(contactData)
            })
                .then((response) => {
                    if (response.status === 200) {
                        this.write('<br>Thank you for reaching out. I will get back to you as soon as possible.');
                    } else {
                        console.log(response);
                        this.write('<br>Error sending message. Maybe you should try emailing me directly at <a class="exec" href="mailto:corvettecole@gmail.com>corvettecole@gmail.com</a>');
                    }
                })
                .catch(error => {
                    console.log(error);
                    this.write('<br>Error sending message. Maybe you should try emailing me directly at <a class="exec" href="mailto:corvettecole@gmail.com>corvettecole@gmail.com</a>');
                })
                .then(function () {
                    cb();
                });
        }


    }.bind(this._terminal);


    this._terminal.write('Enter your email: ');
    this._terminal.newStdout();
    this._terminal.scroll();
}

COMMANDS.tree = function (argv, cb) {
    let term = this._terminal,
        home;

    function writeTree(dir, level) {
        dir.contents.forEach(function (entry) {
            let str = '';

            if (entry.name.startswith('.'))
                return;
            for (let i = 0; i < level; i++)
                str += '|  ';
            str += '|&mdash;&mdash;';
            term.write(str);
            term.writeLink(entry, term.dirString(dir) + '/' + entry.name);
            term.write('<br>');
            if (entry.type === 'dir')
                writeTree(entry, level + 1);
        });
    }

    home = this._terminal.getEntry('~');
    this._terminal.writeLink(home, '~');
    this._terminal.write('<br>');
    writeTree(home, 0);
    cb();
}

COMMANDS.help = function (argv, cb) {
    this._terminal.write(
        'You can navigate either by clicking on anything that ' +
        '<a href="javascript:void(0)">underlines</a> when you put your mouse ' +
        'over it, or by typing commands in the terminal. Type the name of a ' +
        '<span class="exec">link</span> to view it. Use "cd" to change into a ' +
        '<span class="dir">directory</span>, or use "ls" to list the contents ' +
        'of that directory. The contents of a <span class="text">file</span> ' +
        'can be viewed using "cat". <span class="img">Images</span> are ' +
        'displayed using "gimp".<br><br>If there is a command you want to get ' +
        'out of, press Ctrl+C or Ctrl+D.<br><br>');
    this._terminal.write('Commands are:<br>');
    for (const c in this._terminal.commands) {
        if (this._terminal.commands.hasOwnProperty(c) && !c.startswith('_'))
            this._terminal.write(c + '  ');
    }
    cb();
}
