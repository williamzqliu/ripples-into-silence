// js/sequence/state.js
//
// Where the sequence has got to: which year is on screen, and how many of
// that year's incidents have already been released. Two modules need it, so
// it lives in its own file. It used to be passed down the call chain as six
// separate getter and setter closures, which made every launch a ten
// argument call for the sake of two numbers.

export const state = {
  yearIndex: 0,
  launchedThisYear: 0,

  countLaunch() {
    return ++this.launchedThisYear;
  },

  advanceYear() {
    this.launchedThisYear = 0;
    return ++this.yearIndex;
  },

  reset() {
    this.yearIndex = 0;
    this.launchedThisYear = 0;
  },
};
