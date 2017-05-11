/**
 * @file captions-button.js
 */
import TrackButton from '../track-button.js';
import TextTrackMenuItem from './text-track-menu-item.js';
import OffTextTrackMenuItem from './off-text-track-menu-item.js';
import Component from '../../component.js';
// import CaptionSettingsMenuItem from './caption-settings-menu-item.js';

/**
 * The button component for toggling and selecting captions
 *
 * @param {Object} player  Player object
 * @param {Object=} options Object of option names and values
 * @param {Function=} ready    Ready callback function
 * @extends TextTrackButton
 * @class CaptionsButton
 */
class SimpleCaptionsButton extends TrackButton {

  constructor(player, options, ready) {

    options.tracks = player.textTracks();
    super(player, options, ready);

    this.el_.setAttribute('aria-label', 'Simple Captions Menu');
  }

  /**
   * Allow sub components to stack CSS class names
   *
   * @return {String} The constructed class name
   * @method buildCSSClass
   */
  buildCSSClass() {
    return `vjs-simple-captions-button ${super.buildCSSClass()}`;
  }

  createEl() {
    return super.createEl('div', {
      className: this.buildCSSClass(),
      innerHTML: '字幕'
    });
  }

  /**
   * Update caption menu items
   *
   * @method update
   */
  update() {
    const threshold = 1;

    // super.update() will finally call createItems()
    super.update();

    if (this.items && this.items.length > threshold) {
      this.show();
      this.player().getChild('simpleTextTrackSettings').updateTracks(this.menu, this.items);
    } else {
      this.hide();
    }
  }

  /**
   * Create caption menu items
   *
   * @return {Array} Array of menu items
   * @method createItems
   */
  createItems(items = []) {
    items.push(new OffTextTrackMenuItem(this.player_, {
      kind: this.kind_,
      label: 'No Track',
      attrs: {
        name: 'No Track'
      }
    }));

    const tracks = this.player_.textTracks();

    if (!tracks) {
      return items;
    }

    for (let i = 0; i < tracks.length; i++) {
      const track = tracks[i];
      const title = track.label;

      // only add tracks that are of the appropriate kind and have a label
      if (track.kind === this.kind_) {
        items.push(new TextTrackMenuItem(this.player_, {
          track,
          // MenuItem is selectable
          selectable: true,
          attrs: { title }
        }));
      }
    }

    return items;
  }

  /**
   * Handle click on menu item
   *
   * @method handleClick
   */
  handleClick() {
    const simpleTextTrackSettings = this.player().getChild('simpleTextTrackSettings');

    if (simpleTextTrackSettings.isHide()) {
      simpleTextTrackSettings.show();
    } else {
      simpleTextTrackSettings.hide();
    }
  }

}

SimpleCaptionsButton.prototype.kind_ = 'captions';
SimpleCaptionsButton.prototype.controlText_ = '字幕';

Component.registerComponent('SimpleCaptionsButton', SimpleCaptionsButton);
export default SimpleCaptionsButton;
