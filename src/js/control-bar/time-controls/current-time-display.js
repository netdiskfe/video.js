/**
 * @file current-time-display.js
 */
import Component from '../../component.js';
import * as Dom from '../../utils/dom.js';
import formatTime from '../../utils/format-time.js';

/**
 * Displays the current time
 *
 * @param {Player|Object} player
 * @param {Object=} options
 * @extends Component
 * @class CurrentTimeDisplay
 */
class CurrentTimeDisplay extends Component {

  constructor(player, options) {
    super(player, options);

    this.on(player, 'timeupdate', this.updateContent);
  }

  /**
   * Create the component's DOM element
   *
   * @return {Element}
   * @method createEl
   */
  createEl() {
    const el = super.createEl('div', {
      className: 'vjs-current-time vjs-time-control vjs-control'
    });

    this.contentEl_ = Dom.createEl('div', {
      className: 'vjs-current-time-display',
      // label the current time for screen reader users
      innerHTML: '<span class="vjs-control-text">Current Time </span>' + '0:00'
    }, {
      // tell screen readers not to automatically read the time as it changes
      'aria-live': 'off'
    });

    el.appendChild(this.contentEl_);
    return el;
  }

  /**
   * Update current time display
   *
   * @method updateContent
   */
  updateContent() {
    // Allows for smooth scrubbing, when player can't keep up.
    const time = (this.player_.scrubbing()) ? this.player_.getCache().currentTime : this.player_.currentTime();
    const localizedText = this.localize('Current Time');
    const formattedTime = formatTime(time, this.player_.duration());

    if (formattedTime !== this.formattedTime_) {
      this.player_.removeClass('vjs-loading');
      this.formattedTime_ = formattedTime;
      this.lastUpdateTime_ = +new Date;
      this.contentEl_.innerHTML = `<span class="vjs-control-text">${localizedText}</span> ${formattedTime}`;
    } else {
      if ((time <= 0 || (this.lastUpdateTime_ && +new Date - this.lastUpdateTime_ >= 1500)) &&
        !(this.player_.hasClass('vjs-waiting') || this.player_.hasClass('vjs-seeking'))) {
        this.player_.addClass('vjs-loading');
      }
    }
  }

}

Component.registerComponent('CurrentTimeDisplay', CurrentTimeDisplay);
export default CurrentTimeDisplay;
