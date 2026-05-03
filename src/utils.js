/**
 * When turning a light off, send only { On: false/0 } to avoid HAP errors
 * from setting brightness/color on a device being powered down.
 */
function filterIfOff(payload) {
  if (payload.On === 0 || payload.On === false) {
    return { On: payload.On };
  }
  return payload;
}

module.exports = { filterIfOff };
