/**
 * @file simple-text-track-settings.js
 */
import Component from '../component';
import * as Events from '../utils/events.js';
import * as Fn from '../utils/fn.js';
import * as Dom from '../utils/dom.js';
import log from '../utils/log.js';
import safeParseTuple from 'safe-json-parse/tuple';
import window from 'global/window';
import document from 'global/document';

function captionOptionsMenuTemplate(uniqueId, dialogLabelId, dialogDescriptionId) {
  const template = `
    <div role="document">
      <div role="heading" aria-level="1" id="${dialogLabelId}" class="vjs-control-text">Captions Settings Dialog</div>
      <div id="${dialogDescriptionId}" class="vjs-control-text">Beginning of dialog window. Escape will cancel and close the window.</div>
      <div class="vjs-simpletracksettings">
        <div class="vjs-settings-item">
          <label class="vjs-label" for="track-select-${uniqueId}">${this.localize('Current Text Track')}</label>
          <div id="track-select-${uniqueId}" class="vjs-track-select vjs-setting-box">
            <div class="current-track vjs-icon-dropdown">${this.localize('No Track')}</div>
            <div class="tracks-pop-list-box">
              <!-- track-list -->
            </div>
          </div>
        </div>
        <div class="vjs-settings-item time-adjust-settings-item">
          <label class="vjs-label" for="captions-time-adjust-${uniqueId}">${this.localize('Time Ajust')}</label>
          <div id="captions-time-adjust-${uniqueId}" class="vjs-captions-time-adjust vjs-setting-box">
            <div class="backward-box">
              <button class="backward vjs-icon-remove"></button>
              <div class="backward-tip">${this.localize('Track backward')}</div>
            </div>
            <div class="current-time-adjust-box"><span class="current-time-adjust">0</span>${this.localize('seconds')}</div>
            <div class="forward-box">
              <button class="forward vjs-icon-add"></button>
              <div class="forward-tip">${this.localize('Track forward')}</div>
            </div>
          </div>
        </div>
        <div class="vjs-settings-item font-size-settings-item">
          <label class="vjs-label" for="captions-font-size-${uniqueId}">${this.localize('Font Size')}</label>
          <div id="captions-font-size-${uniqueId}" class="vjs-captions-font-size vjs-setting-box">
            <div class="line"></div>
            <ul class="size-list">
              <li class="size-item small">
                <div class="circle" index=0></div>
                <div class="size-intro">小</div>
              </li>
              <li class="size-item middle default">
                <div class="circle" index=1></div>
                <div class="size-intro">中</div>
              </li>
              <li class="size-item big">
                <div class="circle" index=2></div>
                <div class="size-intro">大</div>
              </li>
              <li class="size-item super-big">
                <div class="circle" index=3></div>
                <div class="size-intro">超大</div>
              </li>
            </ul>
            <div class="drag-button"></div>
          </div>
        </div>
        <div class="vjs-settings-item vjs-default-button-box">
          <div class="vjs-default-button">${this.localize('Back Defaults')}</div>
        </div>
      </div> <!-- vjs-simpletracksettings -->
    </div> <!--  role="document" -->
  `;

  return template;
}

/**
 * Manipulate settings of texttracks
 *
 * @param {Object} player  Main Player
 * @param {Object=} options Object of option names and values
 * @extends Component
 * @class TextTrackSettings
 */
class SimpleTextTrackSettings extends Component {

  constructor(player, options) {
    super(player, options);
    this.hide();

    // Grab `persistTextTrackSettings` from the player options if not passed in child options
    if (options.persistTextTrackSettings === undefined) {
      this.options_.persistTextTrackSettings = this.options_.playerOptions.persistTextTrackSettings;
    }

    // dialog event
    Events.on(this.contentEl(), 'mouseleave', Fn.bind(this, function(event) {
      this.hide();
    }));

    Events.on(document, 'click', Fn.bind(this, function(event) {
      const simpleCaptionsButton = this.player().getChild('controlBar').getChild('simpleCaptionsButton');

      if (!this.isHide() &&
        !Dom.contains(this.contentEl(), event.target) &&
        this.contentEl() !== event.target &&
        !Dom.contains(simpleCaptionsButton.contentEl(), event.target) &&
        simpleCaptionsButton.contentEl() !== event.target) {
        this.hide();
      }
    }));

    // track select option
    this.trackSelectBox = this.$('.vjs-track-select');
    this.currTrack = this.$('.vjs-track-select .current-track');
    this.tracksList = this.$('.vjs-track-select .tracks-pop-list-box');

    // time adjust
    this.currTimeAdjust = this.$('.vjs-captions-time-adjust .current-time-adjust');
    this.backward = this.$('.vjs-captions-time-adjust .backward');
    this.forward = this.$('.vjs-captions-time-adjust .forward');

    // font size percent
    this.fontSizeBox = this.$('.vjs-captions-font-size');
    this.dragButton = this.$('.vjs-captions-font-size .drag-button');
    this.fontSizeCircles = this.$$('.vjs-captions-font-size .circle');
    this.introList = this.$$('.vjs-captions-font-size .size-item .size-intro');

    // default button
    this.defaultButton = this.$('.vjs-default-button');

    // force prevent main view hidden before this settings dialog hidden
    this.player().forceActiveComponents.push(this);

  }

  eventBind() {
    if (!this.hasBind) {
      this.hasBind = true;

      // track select event
      Events.on(this.trackSelectBox, 'click', Fn.bind(this, this.trackSelectFn));
      Events.on(this.currTrack, 'mouseenter', Fn.bind(this, function() {
        this.tracksListDisplay(true);
      }));
      Events.on(this.currTrack, 'mouseleave', Fn.bind(this, function() {
        this.tracksListDisplay(false);
      }));
      Events.on(this.tracksList, 'mouseenter', Fn.bind(this, function() {
        this.tracksListDisplay(true);
      }));
      Events.on(this.tracksList, 'mouseleave', Fn.bind(this, function() {
        this.tracksListDisplay(false);
      }));

      // time adjust event
      Events.on(this.backward, 'click', Fn.bind(this, this.timeBackwardFn));
      Events.on(this.forward, 'click', Fn.bind(this, this.timeForwardFn));

      // font size event
      Events.on(this.dragButton, 'mousedown', Fn.bind(this, this.dragButtonDown));
      Events.on(this.dragButton, 'mouseup', Fn.bind(this, this.dragButtonUp));

      Events.on(this.fontSizeBox, 'mouseleave', Fn.bind(this, this.fontSizeBoxLeave));

      for (let i = 0; i < this.fontSizeCircles.length; i++) {
        Events.on(this.fontSizeCircles[i], 'click', Fn.bind(this, this.clickFontButton));
      }

      // default button
      Events.on(this.defaultButton, 'click', Fn.bind(this, this.resetDefault));
    }
  }

  /**
   * remove all event
   *
   * @method eventUnbind
   */
  eventUnbind() {
    if (this.hasBind) {
      this.hasBind = false;

      // track select event
      Events.off(this.trackSelectBox, 'click');

      // time adjust event
      Events.off(this.backward, 'click');
      Events.off(this.forward, 'click');

      // font size event
      Events.off(this.dragButton, 'mousedown');
      Events.off(this.dragButton, 'mouseup');

      Events.off(this.fontSizeBox, 'mouseleave');

      for (let i = 0; i < this.fontSizeCircles.length; i++) {
        Events.off(this.fontSizeCircles[i], 'click');
      }

      // default button
      Events.off(this.defaultButton, 'click');
    }
  }

  /**
   * select track
   *
   * @method trackSelectFn
   */
  trackSelectFn(event) {
    const target = event.target;

    this.tracks.forEach(track => {
      if (track.contentEl() === target) {
        let label = this.localize(track.options_.label);
        let num = 0;
        let i = 0;

        for (; i < label.length; i++) {
          if (label.charCodeAt(i) < 128) {
            num++;
          } else {
            // chinese
            num += 2;
          }
          if (num > 16) {
            label = label.substring(0, i) + '...srt';
            break;
          }
        }
        Dom.insertContent(this.currTrack, label);
        this.tracksListDisplay(false);
      }
    });
  }

  /**
   * time backward
   *
   * @method timeBackward
   */
  timeBackwardFn() {
    const currTime = parseFloat(Dom.textContentGet(this.currTimeAdjust));

    Dom.textContent(this.currTimeAdjust, currTime - 0.5);
    this.updateDisplay();
  }

  /**
   * time forward
   *
   * @method timeForward
   */
  timeForwardFn() {
    const currTime = parseFloat(Dom.textContentGet(this.currTimeAdjust));

    Dom.textContent(this.currTimeAdjust, currTime + 0.5);
    this.updateDisplay();
  }

  /**
   * font size button down event, then listening mousemove
   *
   * @method timeForward
   */
  dragButtonDown() {
    if (!this.fontPercentDrag) {
      this.fontPercentDrag = true;
      Events.on(this.fontSizeBox, 'mousemove', Fn.bind(this, this.dragButtonMove));
    }
  }

  /**
   * font size button up event, then cancel listening mousemove
   *
   * @method timeForward
   */
  dragButtonUp() {
    if (this.fontPercentDrag) {
      this.fontPercentDrag = false;
      Events.off(this.fontSizeBox, 'mousemove', Fn.bind(this, this.dragButtonMove));
      const left = parseInt(this.dragButton.style.left, 10);

      this.selectFontSize(left);
    }
  }

  /**
   * event function of drag button move
   *
   * @param  {Object} event native event of mousemove
   * @method dragButtonMove
   */
  dragButtonMove(event) {
    if (this.fontPercentDrag) {
      Dom.removeElClass(this.dragButton, 'ani');
      const positionPercent = Dom.getPointerPosition(this.fontSizeBox, event);

      this.dragButton.style.left = parseInt(window.getComputedStyle(this.fontSizeBox).width, 10) * positionPercent.x + 'px';
    }
  }

  /**
   * direct select size
   *
   * @param  {Event} event  native event
   * @method clickFontButton
   */
  clickFontButton(event) {
    const positionPercent = Dom.getPointerPosition(this.fontSizeBox, event);
    const clickPos = parseInt(window.getComputedStyle(this.fontSizeBox).width, 10) * positionPercent.x;

    this.selectFontSize(clickPos);
  }

  /**
   * mouse leave font size box
   *
   * @method fontSizeBoxLeave
   */
  fontSizeBoxLeave() {
    if (this.fontPercentDrag) {
      this.fontPercentDrag = false;
      Events.off(this.fontSizeBox, 'mousemove', Fn.bind(this, this.dragButtonMove));
      const left = parseInt(this.dragButton.style.left, 10);

      this.selectFontSize(left);
    }
  }

  /**
   * select font size
   *
   * @method selectFontSize
   */
  selectFontSize(pos) {
    Dom.addElClass(this.dragButton, 'ani');
    for (let i = 0; i < this.ranges.length; i++) {
      if (pos >= this.ranges[i].lowmit && pos < this.ranges[i].upmit) {
        this.dragButton.style.left = `${this.ranges[i].pos}px`;
        Dom.setElData(this.dragButton, 'value', this.ranges[i].value);
        this.updateDisplay();
        this.introList[i].style.color = '#2e85ff';
      } else {
        this.introList[i].style.color = '#bbb';
      }
    }
  }

  /**
   * back to default
   *
   * @method resetDefault
   */
  resetDefault() {
    this.selectFontSize(this.ranges[1].pos);
    Dom.textContent(this.currTimeAdjust, 0);
    this.updateDisplay();
  }

  /**
   * prepare ranges for font size options
   *
   * @return {Element}
   * @method calculateRanges
   */
  calculateRanges() {
    if (!this.ranges) {
      this.range = parseInt(window.getComputedStyle(this.fontSizeBox).width, 10) / 6;
      this.ranges = [
        {lowmit: 0, upmit: this.range, pos: 0, value: 0.75},
        {lowmit: this.range, upmit: this.range * 3, pos: 64, value: 1},
        {lowmit: this.range * 3, upmit: this.range * 5, pos: 124, value: 1.5},
        {lowmit: this.range * 5, upmit: this.range * 6, pos: 184, value: 2}
      ];

      this.restoreSettings();
    }
  }

  /**
   * Create the component's DOM element
   *
   * @return {Element}
   * @method createEl
   */
  createEl() {
    const uniqueId = this.id_;
    const dialogLabelId = 'TTsettingsDialogLabel-' + uniqueId;
    const dialogDescriptionId = 'TTsettingsDialogDescription-' + uniqueId;

    return super.createEl('div', {
      className: 'vjs-simple-caption-settings vjs-modal-overlay',
      innerHTML: captionOptionsMenuTemplate.call(this, uniqueId, dialogLabelId, dialogDescriptionId),
      tabIndex: -1
    }, {
      'role': 'dialog',
      'aria-labelledby': dialogLabelId,
      'aria-describedby': dialogDescriptionId
    });
  }

  /**
   * Get texttrack settings
   * Settings are font size percent and time adjust
   *
   * @return {Object}
   * @method getValues
   */
  getValues() {
    const fontPercent = window.parseFloat(Dom.getElData(this.dragButton).value);
    const timeAjust = window.parseFloat(Dom.textContentGet(this.currTimeAdjust));

    const result = {
      fontPercent,
      timeAjust
    };

    for (const name in result) {
      if (result[name] === '' || result[name] === 'none' || (name === 'fontPercent' && result[name] === 1.00)) {
        delete result[name];
      }
    }
    return result;
  }

  /**
   * Set texttrack settings
   * Settings are font size percent and time adjust
   *
   * @param {Object} values Object with texttrack setting values
   * @method setValues
   */
  setValues(values) {

    const fontPercent = values.fontPercent;

    for (let i = 0; i < this.ranges.length; i++) {
      if (this.ranges[i].value === fontPercent) {
        this.selectFontSize(this.ranges[i].pos);
        break;
      }
    }

    let timeAjust = values.timeAjust;

    if (timeAjust) {
      timeAjust = timeAjust.toFixed(1);
    }

    Dom.textContent(this.currTimeAdjust, timeAjust);
  }

  /**
   * Restore texttrack settings
   *
   * @method restoreSettings
   */
  restoreSettings() {
    let err;
    let values;

    try {
      [err, values] = safeParseTuple(window.localStorage.getItem('vjs-simple-text-track-settings'));

      if (err) {
        log.error(err);
      }
    } catch (e) {
      log.warn(e);
    }

    if (values) {
      this.setValues(values);
    }
  }

  /**
   * Save texttrack settings to local storage
   *
   * @method saveSettings
   */
  saveSettings() {
    if (!this.options_.persistTextTrackSettings) {
      return;
    }

    const values = this.getValues();

    try {
      if (Object.getOwnPropertyNames(values).length > 0) {
        window.localStorage.setItem('vjs-simple-text-track-settings', JSON.stringify(values));
      } else {
        window.localStorage.removeItem('vjs-simple-text-track-settings');
      }
    } catch (e) {
      log.warn(e);
    }
  }

  /**
   * Update display of texttrack settings
   *
   * @method updateDisplay
   */
  updateDisplay() {
    const ttDisplay = this.player_.getChild('textTrackDisplay');

    if (ttDisplay) {
      ttDisplay.updateDisplay();
    }
    this.saveSettings();
  }

  /**
   * Update track menu
   *
   * @param  {[type]} menu   [description]
   * @param  {[type]} tracks [description]
   * @return {[type]}        nothing
   */
  updateTracks(menu, tracks) {
    const threshold = 1;

    this.tracks = tracks;

    // first track is No Tracks
    if (this.tracks && this.tracks.length > threshold) {
      this.removeClass('havent-tracks');
      Dom.insertContent(this.$('.vjs-track-select .current-track'), this.localize('No Track'));
      Dom.insertContent(this.$('.tracks-pop-list-box'), menu.contentEl());
      Dom.addElClass(this.currTrack, 'vjs-icon-dropdown');
      this.calculateRanges();
      this.eventBind();
    } else {
      this.addClass('havent-tracks');
      Dom.insertContent(this.$('.vjs-track-select .current-track'), this.localize('Have not Track'));
      Dom.removeElClass(this.currTrack, 'vjs-icon-dropdown');
      Dom.removeElClass(this.currTrack, 'vjs-icon-dropup');
      this.eventUnbind();
    }
  }

  /**
   * show or hidetracks pop list
   *
   * @param  {Boolean} show  show or hide
   * @return {[type]}        nothing
   */
  tracksListDisplay(show) {
    if (show) {
      Dom.addElClass(this.currTrack, 'vjs-icon-dropup');
      Dom.removeElClass(this.currTrack, 'vjs-icon-dropdown');
      this.tracksList.style.display = 'block';
    } else {
      Dom.addElClass(this.currTrack, 'vjs-icon-dropdown');
      Dom.removeElClass(this.currTrack, 'vjs-icon-dropup');
      this.tracksList.style.display = 'none';
    }
  }

}

Component.registerComponent('SimpleTextTrackSettings', SimpleTextTrackSettings);

export default SimpleTextTrackSettings;
