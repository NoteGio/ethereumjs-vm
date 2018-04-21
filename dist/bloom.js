'use strict';

var Buffer = require('safe-buffer').Buffer;
var assert = require('assert');
var utils = require('ethereumjs-util');
var byteSize = 256;

/**
 * Bloom filters in Ethereum exclude leading zeros from the values they hash.
 * For example, if a topic is an address, it will trim off the first 12 bytes
 * before hashing the value to add it to the bloom filter.
 */
function trimBuffer(buff) {
  for (var i = 0; i < buff.length; i++) {
    if (buff[i] != 0) {
      return buff.slice(i);
    }
  }
}

/**
 * Represents a Bloom
 * @constructor
 * @param {Buffer} bitvector
 */
var Bloom = module.exports = function (bitvector) {
  if (!bitvector) {
    this.bitvector = utils.zeros(byteSize);
  } else {
    assert(bitvector.length === byteSize, 'bitvectors must be 2048 bits long');
    this.bitvector = bitvector;
  }
};

/**
 * adds an element to a bit vector of a 64 byte bloom filter
 * @method add
 * @param {Buffer} element
 */
Bloom.prototype.add = function (e) {
  e = utils.sha3(trimBuffer(e));
  var mask = 2047; // binary 11111111111

  for (var i = 0; i < 3; i++) {
    var first2bytes = e.readUInt16BE(i * 2);
    var loc = mask & first2bytes;
    var byteLoc = loc >> 3;
    var bitLoc = 1 << loc % 8;
    this.bitvector[byteSize - byteLoc - 1] |= bitLoc;
  }
};

/**
 * checks if an element is in the blooom
 * @method check
 * @param {Buffer} element
 */
Bloom.prototype.check = function (e) {
  e = utils.sha3(trimBuffer(e));
  var mask = 511; // binary 111111111
  var match = true;

  for (var i = 0; i < 3 && match; i++) {
    var first2bytes = e.readUInt16BE(i * 2);
    var loc = mask & first2bytes;
    var byteLoc = loc >> 3;
    var bitLoc = 1 << loc % 8;
    match = this.bitvector[byteSize - byteLoc - 1] & bitLoc;
  }

  return Boolean(match);
};

/**
 * checks if multple topics are in a bloom
 * @method check
 * @param {Buffer} element
 */
Bloom.prototype.multiCheck = function (topics) {
  var self = this;
  return topics.every(function (t) {
    if (!Buffer.isBuffer(t)) {
      t = Buffer.from(t, 'hex');
    }
    return self.check(t);
  });
};

/**
 * bitwise or blooms together
 * @method or
 * @param {Bloom} bloom
 */
Bloom.prototype.or = function (bloom) {
  if (bloom) {
    for (var i = 0; i <= byteSize; i++) {
      this.bitvector[i] = this.bitvector[i] | bloom.bitvector[i];
    }
  }
};