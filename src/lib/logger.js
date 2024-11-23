export class Log {

  constructor(logger, debugMode) {
    this.logger = logger;
    this.debugMode = debugMode;
  }

  debug(msg) {
    if (this.debugMode) {
      this.logger.info(msg);
    } else {
      this.logger.debug(msg);
    }
  }

  info(msg) {
    this.logger.info(msg);
  }

  warn(msg) {
    this.logger.warn(msg);
  }

  error(msg) {
    this.logger.error(msg);
  }

  log(msg) {
    this.logger.info(msg);
  }
}
