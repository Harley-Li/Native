customElements.define(
    'harley-calendar',
    class HarleyCalendar extends HTMLElement {
        static observedAttributes = ['dark-mode', 'ymd', 'refer-id', 'init-date', 'style'];

        connectedCallback() {
            const shadow = this.attachShadow({ mode: 'open' });
            shadow.appendChild(this.genEle(this.genBaseHtml()));
            (async () => {
                const styleCode = await fetch('./dt.css');
                const style = document.createElement('style');
                style.textContent = await styleCode.text();
                shadow.appendChild(style);
            })();

            const WeekArray = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
            const MonthArray = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
            let inputYear = shadow.querySelector('input.year');
            let inputMonth = shadow.querySelector('input.month');
            let inputDay = shadow.querySelector('input.day');
            let inputHour = shadow.querySelector('.time-area .v-hour');
            let inputMinute = shadow.querySelector('.time-area .v-min');
            let inputSec = shadow.querySelector('.time-area .v-sec');
            let timeArea = shadow.querySelector('.time-area');
            let inProgress = false;
            let whichWay;
            let selectedIndex = 0;

            // Event handler
            (() => {
                shadow.querySelector('.date-items.body').addEventListener('focusin', (e) => {
                    const item = e.target.closest('a');
                    if (item) {
                        shadow.querySelector('.grid-container .active')?.classList.remove('active');
                        e.target.closest('a').classList.add('active');
                        updateDatePicker(item);
                    }
                });

                shadow.querySelector('.date-items.body').addEventListener('keydown', (e) => {
                    const index = e.target.getAttribute('data-index');
                    e.stopImmediatePropagation();
                    e.preventDefault();
                    if (!inProgress) {
                        if (e.key === 'ArrowRight') {
                            let nextDate = e.target.nextElementSibling;
                            if (nextDate.classList.contains('nextMonth')) {
                                inProgress = true;
                                moveNext();
                            } else {
                                whichWay = 'nextDay';
                                nextDate.focus();
                            }
                        } else if (e.key === 'ArrowLeft') {
                            let preDate = e.target.previousElementSibling;
                            if (preDate && preDate.classList.contains('preMonth')) {
                                inProgress = true;
                                movePrevious();
                            } else {
                                preDate.focus();
                                whichWay = 'preDay';
                            }
                        } else if (e.key === 'ArrowDown') {
                            let nextWeek = e.target.closest('div').querySelector(`a:nth-child(${parseInt(index) + 8})`);
                            if (!nextWeek || nextWeek.classList.contains('nextMonth')) {
                                inProgress = true;
                                moveNext();
                                whichWay = 'nextWeek';
                            } else {
                                nextWeek.focus();
                            }
                        } else if (e.key === 'ArrowUp') {
                            let preWeek = e.target.closest('div').querySelector(`a:nth-child(${parseInt(index) - 6})`);
                            if (!preWeek || preWeek.classList.contains('preMonth')) {
                                inProgress = true;
                                movePrevious();
                            } else {
                                whichWay = 'preWeek';
                                preWeek.focus();
                            }
                        } else if (e.key === 'Enter' || e.key === '') {
                            drawerToggle();
                        } else if (e.key === 'Tab') {
                            e.preventDefault();
                            if (e.shiftKey) {
                                shadow.querySelector('.data-picker-header.right').focus();
                            } else {
                                shadow.querySelector('.clear-btn').focus();
                            }
                        }
                    }
                });

                shadow.querySelector('.date-items.body').addEventListener('click', (e) => {
                    const item = e.target.closest('a');
                    if (item) {
                        drawerToggle();
                    }
                });

                // input events handler input area events start
                shadow.querySelectorAll('.calendar-box input').forEach((item) => {
                    // update the day based on the month
                    item.addEventListener('focus', (e) => {
                        let input = e.target;
                        if (input.classList.contains('day')) {
                            let year = inputYear.value ? inputYear.value : new Date().getFullYear();
                            let month = inputMonth.value ? inputMonth.value : '01';
                            let maxDay = getDays(year, month);
                            input.setAttribute('max', maxDay + '');
                            if (input.value > maxDay) input.value = maxDay;
                        }
                        shadow.querySelector('.dt-picker-widget').classList.add('active');
                    });

                    item.addEventListener('blur', (e) => {
                        let input = e.target;
                        let min = parseInt(input.getAttribute('min'));
                        let disVal = parseInt(input.value);
                        let max = parseInt(input.getAttribute('max'));
                        if (disVal > max) {
                            input.value = max;
                        } else if (disVal < min) {
                            input.value = min;
                        }
                        shadow.querySelector('.dt-picker-widget').classList.remove('active');
                    });

                    // adding '0' for month and day less than 10
                    item.addEventListener('change', (e) => {
                        let input = e.target;
                        if (input.classList.contains('month')) {
                            if (parseInt(input.value) < 10) {
                                input.value = '0' + parseInt(input.value);
                            }
                        } else if (parseInt(input.value) < 10) {
                            input.value = '0' + parseInt(input.value);
                        }
                    });

                    item.addEventListener('keydown', (e) => {
                        let input = e.target;
                        if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
                            if (input.value === '') {
                                e.preventDefault();
                                if (input.classList.contains('year')) {
                                    input.value = new Date().getFullYear();
                                } else if (e.key === 'ArrowUp') {
                                    input.value = '01';
                                } else {
                                    input.value = input.getAttribute('max');
                                }
                            } else if (!input.classList.contains('year')) {
                                if (e.key === 'ArrowUp' && input.value === input.getAttribute('max')) {
                                    e.preventDefault();
                                    input.value = '01';
                                }
                                if (e.key === 'ArrowDown' && input.value === '01') {
                                    e.preventDefault();
                                    input.value = input.getAttribute('max');
                                }
                            }
                        } else if (e.key === 'ArrowRight') {
                            e.target.nextElementSibling?.focus();
                        } else if (e.key === 'ArrowLeft') {
                            e.target.previousElementSibling?.focus();
                        } else if (e.key === ' ') {
                            e.preventDefault();
                            drawerToggle();
                            initDateDrawer('init');
                        }
                        reflectSelected();
                    });
                });

                // show drawer
                shadow.querySelector('.date-input-area').addEventListener('click', (e) => {
                    if (e.target.closest('a')) {
                        drawerToggle();
                    }
                    if (shadow.querySelectorAll('.grid-container').length === 0) {
                        initDateDrawer('init');
                    }
                    document.body.addEventListener('click', closeDrawer);
                    window.addEventListener('scroll', closeDrawer);
                });

                // Today button event
                shadow.querySelector('.today-btn').addEventListener('click', (e) => {
                    const items = new Date();
                    inputYear.value = items.getFullYear();
                    inputMonth.value = items.getMonth() + 1 < 10 ? '0' + (items.getMonth() + 1) : items.getMonth() + 1;
                    inputDay.value = items.getDate() < 10 ? '0' + items.getDate() : items.getDate();
                    shadow.querySelector('.currentDate').textContent = items.toLocaleDateString();
                    drawerToggle();
                });

                shadow.querySelector('.today-btn').addEventListener('keydown', (e) => {
                    e.preventDefault();
                    if (e.key === 'Enter' || e.key === ' ') {
                    } else if (e.key === 'Tab') {
                        shadow.querySelector('.today-btn').click();
                        if (e.shiftKey) {
                            shadow.querySelector('.year-month-picker .drawer-btn').focus();
                        } else {
                            shadow.querySelector('.clear-btn').focus();
                        }
                    }
                });

                // Clear button event
                shadow.querySelector('.clear-btn').addEventListener('click', (e) => {
                    shadow.querySelectorAll('.calendar-box input').forEach((item) => {
                        item.value = '';
                    });
                    if (e.type !== 'click') {
                        shadow.querySelector('.calendar-box input').focus();
                    }
                    drawerToggle();
                });

                shadow.querySelector('.clear-btn').addEventListener('keydown', (e) => {
                    if (e.shiftKey && e.key === 'Tab') {
                        e.preventDefault();
                        shadow.querySelector('.grid-container:nth-child(2)>a.currentMonth.active').focus();
                    }
                });

                // ------------------------------- drawer area events start  ---------------------------------------
                // switch to previous month
                shadow.querySelector('.month-picker .left').addEventListener('click', (e) => {
                    if (!inProgress) {
                        inProgress = true;
                        movePrevious();
                        whichWay = 'preMonth';
                    }
                });

                // move the focus into date grid
                shadow.querySelector('.month-picker .left').addEventListener('keydown', (e) => {
                    if (e.key === 'Tab' && e.shiftKey) {
                        e.preventDefault();
                        shadow.querySelector('.year-month-picker .drawer-btn').focus();
                    }
                });

                // switch to next month
                shadow.querySelector('.month-picker .right').addEventListener('click', (e) => {
                    if (!inProgress) {
                        inProgress = true;
                        moveNext();
                        whichWay = 'nextMonth';
                    }
                });

                // move the focus into date grid
                shadow.querySelector('.month-picker .right').addEventListener('keydown', (e) => {
                    if (e.key === 'Tab') {
                        e.preventDefault();
                        if (e.shiftKey) {
                            shadow.querySelector('.month-picker .left').focus();
                        } else {
                            shadow.querySelector('.grid-container .current').focus();
                        }
                    } else {
                        e.preventDefault();
                    }
                });

                // year month picker start
                shadow.querySelector('.year-month-picker .drawer-btn').addEventListener('keydown', (e) => {
                    if (e.key === 'Tab' && e.shiftKey) {
                        e.preventDefault();
                        shadow.querySelector('.today-btn').focus();
                    }
                });

                shadow.querySelector('.year-month-picker .drawer-btn').addEventListener('click', (e) => {
                    shadow.querySelector('.year-month-picker').classList.toggle('expanded');
                    let yearOption = '';
                    for (let i = 1900; i <= 2100; i++) {
                        yearOption += `<input type="radio" name="year-opt" value="${i}" id="year_opt_${i}" class="year-option" aria-label="${i}"/>`;
                    }
                    shadow.querySelector('.year-options').innerHTML = yearOption;
                    let monthOptions = '';
                    for (let i = 0; i < MonthArray.length; i++) {
                        monthOptions += `<input type="radio" name="month-opt" value="${
                            i + 1 < 10 ? '0' + (i + 1) : i + 1
                        }" id="month_opt_${i}" class="month-option" aria-label="${MonthArray[i].substring(0, 3)}"/>`;
                    }
                    shadow.querySelector('.month-options').innerHTML = monthOptions;
                    // set Active Year and Month
                    shadow.querySelector(`.month-options>input:nth-child(${new Date().getMonth() + 1})`).classList.add('current', 'active');
                    shadow.querySelectorAll('.year-option').forEach((item) => {
                        if (parseInt(item.value) === parseInt(new Date().getFullYear())) {
                            item.checked = true;
                            item.classList.add('current');
                        } else {
                            item.checked = false;
                            item.classList.remove('current');
                        }
                    });
                    // scroll the Year into the first Row
                    shadow.querySelector('.year-options').scrollTop = shadow.querySelector('.year-option.current').offsetTop - 88;
                });

                shadow.querySelector('.year-month-picker .close-drawer').addEventListener('click', (e) => {
                    let days = getDays(inputYear.value, parseInt(inputMonth.value));
                    if (inputDay.value) {
                        if (parseInt(new Date().getDate()) < 10) {
                            inputDay.value = '0' + parseInt(new Date().getDate());
                        } else {
                            inputDay.value = new Date().getDate();
                        }
                    }
                    if (parseInt(inputDay.value) > days) {
                        inputDay.value = days;
                    }
                    shadow.querySelector('.year-month-picker').classList.toggle('expanded');
                    initDateDrawer('init');
                });

                // mode picker
                shadow.querySelector('.dropdown-drawer').addEventListener('click', (e) => {
                    const targetItem = e.target;
                    if (targetItem.closest('.month-options')) {
                        shadow.querySelector('.month-options.active').classList.remove('active');
                        targetItem.classList.add('active');
                        inputMonth.value = targetItem.getAttribute('data-value');
                    }
                    if (targetItem.tagName === 'LABEL') {
                        targetItem.previousElementSibling.checked = true;
                        inputYear.value = targetItem.previousElementSibling.value;
                    }
                });
            })();

            // when focus the date in the drawer then update the value in the input area
            const updateDatePicker = (selectedDate) => {
                const items = selectedDate.getAttribute('data-ymd').split('/');
                const year = parseInt(items[0]),
                    month = parseInt(items[1]),
                    day = parseInt(items[2]);

                inputYear.value = year;
                inputMonth.value = month < 10 ? '0' + month : month;
                inputDay.value = day < 10 ? '0' + day : day;
            };

            const drawerToggle = () => {
                shadow.querySelector('.date-items.body').innerHTML = '';
                shadow.querySelector('.dt-picker-widget').classList.toggle('show');
                shadow.querySelectorAll('.expanded,.active').forEach((item) => {
                    item.classList.remove('expanded');
                    item.classList.remove('active');
                });
                if (!shadow.querySelector('.dt-picker-widget').classList.contains('show')) {
                    document.body.removeEventListener('click', closeDrawer);
                    window.removeEventListener('scroll', closeDrawer);
                    let year = inputYear.value;
                    let month = inputMonth.value;
                    let day = inputDay.value;
                    if (year && month && day) {
                        this.setAttribute('ymd', year + '/' + month + '/' + day);
                    }
                } else {
                    const position = shadow.querySelector('.dt-picker-widget').getBoundingClientRect();
                    shadow.querySelector('.dt-picker-widget').setAttribute('style', `--top: ${position.top + 40}px; --left: ${position.left}px`);
                }
            };

            // initialize the Grid drawer
            const initDateDrawer = (status) => {
                let weekOptions = '';
                for (let item of WeekArray) {
                    weekOptions += `<div>${item.substring(0, 3)}</div>`;
                }
                shadow.querySelector('.date-items.header').innerHTML = weekOptions;
                shadow.querySelector('.date-items.body').innerHTML = '';
                let currentDate = new Date();
                // default displaying date
                if (inputYear.value && inputMonth.value && inputDay.value && status === 'init') {
                    currentDate = buildDateItem();
                }
                buildGridCode(currentDate.getFullYear(), currentDate.getMonth(), false);
                // Bottom grid date
                let bottomDate = getNextMonth();
                buildGridCode(bottomDate.getFullYear(), bottomDate.getMonth(), false);

                // Top grid date
                let topDate = getPreMonth();
                if (status === 'init') {
                    buildGridCode(topDate.getFullYear(), topDate.getMonth(), true);
                    shadow.querySelector(`.grid-container:nth-child(2)>a.currentMonth[data-ymd="${buildYMD(currentDate)}"]`).focus();
                } else {
                    setTimeout(() => {
                        // reset it, use animation slide in
                        buildGridCode(topDate.getFullYear(), topDate.getMonth(), true);
                    }, 0);

                    // for animation to wait for 200ms
                    setTimeout(() => {
                        shadow.querySelector(`.grid-container>.currentMonth[data-ymd="${buildYMD(currentDate)}"]`).focus();
                    }, 200);
                }
                // set which month and year
                shadow.querySelector('.year-month-picker .year-month').innerHTML =
                    `<span>${MonthArray[currentDate.getMonth()]}</span>` + currentDate.getFullYear();
            };

            // build month based grid
            const buildGridCode = (year, month, isInit) => {
                let current = new Date();
                current.setYear(year);
                current.setMonth(month, 1);
                // index of day in the month
                const indexOfDay = new Date().getDate();
                // get the index of 1st day in the week.
                const dIndex = current.getDay();
                // get how many days in the month
                const days = getDays(year, month + 1);
                current.setDate(current.getDate() - dIndex - 1);
                let innerContent = '<div class="grid-container" role="grid">';
                let whichMonth = '';
                // generate date grid
                for (let i = 0; i < 42; i++) {
                    current.setDate(current.getDate() + 1);
                    if (i < dIndex) {
                        whichMonth = 'preMonth';
                    } else if (i > dIndex - 1 && i < days + dIndex) {
                        whichMonth = 'currentMonth';
                    } else {
                        whichMonth = 'nextMonth';
                    }
                    innerContent += `<a href="javascript:void(0)" role="cell" data-ymd="${buildYMD(current)}" data-index="${i}"
                    class="${
                        i === indexOfDay + dIndex - 1 && new Date().getMonth() === month && new Date().getFullYear() === year ? 'current active' : ''
                    } ${whichMonth}">
                        <span class="sr-only">${current.toDateString()}</span>
                        <span aria-hidden="true">${current.getDate()}</span>
                </a>`;
                }
                innerContent += '</div>';

                let currentElement;
                if (isInit) {
                    shadow.querySelector('.date-items.body').insertBefore(this.genEle(innerContent), shadow.querySelector('.date-items.body div:nth-child(1)'));
                    currentElement = shadow.querySelector('.date-items.body div:first-child');
                } else {
                    shadow.querySelector('.date-items.body').append(this.genEle(innerContent));
                    currentElement = shadow.querySelector('.date-items.body div:last-child');
                }
                return currentElement;
            };

            const buildYMD = (tempDate) => {
                return tempDate.getFullYear() + '/' + (tempDate.getMonth() + 1) + '/' + tempDate.getDate();
            };

            const moveNext = () => {
                let nextMonth = getNextMonth();
                // set which month and year
                shadow.querySelector('.year-month-picker .year-month').innerHTML = `<span>${
                    MonthArray[nextMonth.getMonth()]
                }</span> ${nextMonth.getFullYear()}`;
                let current = buildDateItem();
                current.setMonth(current.getMonth() + 2, 1);
                shadow.querySelector('.date-items.body>div:nth-child(1)').remove();
                buildGridCode(current.getFullYear(), current.getMonth(), false);
                addTransition();
            };

            const movePrevious = () => {
                // set which month and year
                let preMonth = getPreMonth();
                shadow.querySelector('.year-month-picker .year-month').innerHTML = `<span>${MonthArray[preMonth.getMonth()]}</span> ${preMonth.getFullYear()}`;
                let current = buildDateItem();
                current.setMonth(current.getMonth() - 2);
                shadow.querySelector('.date-items.body>div:nth-child(3)').remove();
                buildGridCode(current.getFullYear(), current.getMonth(), true);
                addTransition();
            };

            // get the length of the month
            const getDays = (year, month) => {
                return new Date(year, month, 0).getDate();
            };

            const getNextMonth = () => {
                let current = buildDateItem();
                current.setMonth(current.getMonth() + 1, 1);
                return current;
            };

            const getPreMonth = () => {
                let current = buildDateItem();
                current.setMonth(current.getMonth() - 1, 1);
                return current;
            };

            // icon move pre and next month focus
            const moveFocus = (preNext) => {
                let current;
                if (preNext === 'pre') {
                    current = getPreMonth();
                } else {
                    current = getNextMonth();
                }
                let days = getDays(current.getFullYear(), current.getMonth() + 1);
                // check last day, if previous month doesn't have current day, then focus the last day of previous month.
                if (parseInt(inputDay.value) > days) {
                    current.setDate(days);
                } else {
                    current.setDate(parseInt(inputDay.value));
                }
                return current;
            };
            // Transition related code for resolving the issue
            const stopTransition = () => {
                inProgress = false;
                let current;
                switch (whichWay) {
                    case 'preWeek':
                        current = getPreWeek();
                        break;
                    case 'nextWeek':
                        current = getNextWeek();
                        break;

                    case 'preDay':
                        current = getPreDay();
                        break;
                    case 'nextDay':
                        current = getNextDay();
                        break;
                    case 'nextMonth':
                        current = moveFocus('next');
                        break;
                    case 'preMonth':
                        current = moveFocus('pre');
                        break;
                }
                shadow.querySelector(`.grid-container>.currentMonth[data-ymd="${buildYMD(current)}"]`).focus();
                let currentElement = shadow.querySelector('.grid-container:nth-child(2)');
                currentElement.removeEventListener('transitionend', stopTransition);
            };

            // Transition related code for resolving the issue
            const addTransition = () => {
                let currentElement = shadow.querySelector('.grid-container:nth-child(2)');
                currentElement.addEventListener('transitionend', stopTransition);
            };

            const getNextDay = () => {
                let current = buildDateItem();
                current.setDate(current.getDate() + 1);
                return current;
            };

            const getPreDay = () => {
                let current = buildDateItem();
                current.setDate(current.getDate() - 1);
                return current;
            };

            const getNextWeek = () => {
                let current = buildDateItem();
                current.setDate(current.getDate() + 7);
                return current;
            };

            const getPreWeek = () => {
                let current = buildDateItem();
                current.setDate(current.getDate() - 7);
                return current;
            };

            const closeDrawer = (e) => {
                if (e.target !== this) {
                    drawerToggle();
                }
            };

            // build date object based on input area
            const buildDateItem = () => {
                let currentDate = new Date();
                if (inputYear.value && inputMonth.value && inputDay.value) {
                    currentDate.setYear(parseInt(inputYear.value));
                    currentDate.setMonth(parseInt(inputMonth.value) - 1);
                    currentDate.setDate(parseInt(inputDay.value));
                }
                return currentDate;
            };

            const reflectSelected = () => {
                setTimeout(() => {
                    let year = shadow.querySelector('.year');
                    let month = shadow.querySelector('.month');
                    if (year.value && month.value && day.value) {
                        let day = shadow.querySelector('.day');
                        let tempDate = new Date();
                        tempDate.setFullYear(parseInt(year.value));
                        tempDate.setMonth(parseInt(month.value) - 1);
                        tempDate.setDate(parseInt(day.value));
                        shadow.querySelector('.currentDate').textContent = tempDate.toLocaleDateString();
                    }
                }, 50);
            };

            const setInputTime = (type, index) => {
                switch (type) {
                    case 'h':
                        inputHour.textContent = index < 10 ? '0' + index : index;
                        break;
                    case 'm':
                        inputMinute.textContent = index < 10 ? '0' + index : index;
                        break;
                    case 's':
                        inputSec.textContent = index < 10 ? '0' + index : index;
                        break;
                }

                if (inputHour.textContent || inputMinute.textContent || inputSec.textContent) {
                    inputHour.textContent.length === 0 ? (inputHour.textContent = '00') : '';
                    inputMinute.textContent.length === 0 ? (inputMinute.textContent = '00') : '';
                    inputSec.textContent.length === 0 ? (inputSec.textContent = '00') : '';
                }

                timeArea.classList.add('show');
            };

            // ------------------------------- Time builder start  ---------------------------------------
            (() => {
                const hourContainer = shadow.querySelector('.hour-container');
                const minuteContainer = shadow.querySelector('.minute-container');
                const secondContainer = shadow.querySelector('.second-container');

                for (let i = 0; i < 24; i++) {
                    const li = document.createElement('li');
                    li.innerText = i < 10 ? '0' + i : i;
                    li.setAttribute('t-index', i);
                    hourContainer.append(li);
                }
                for (let i = 0; i < 60; i++) {
                    const li = document.createElement('li');
                    li.innerText = i < 10 ? '0' + i : i;
                    li.setAttribute('t-index', i);
                    minuteContainer.append(li);
                }
                for (let i = 0; i < 60; i++) {
                    const li = document.createElement('li');
                    li.innerText = i < 10 ? '0' + i : i;
                    li.setAttribute('t-index', i);
                    secondContainer.append(li);
                }

                shadow.querySelectorAll('.time-container').forEach((item) => {
                    item.addEventListener('scroll', function (e) {
                        const index = Math.round((this.scrollTop - 16) / 32);
                        e.target.querySelector('.active')?.classList.remove('active');
                        e.target.querySelectorAll('li')[index]?.classList.add('active');

                        setInputTime(item.classList[1], index);
                    });
                });

                shadow.querySelector('.now-btn').addEventListener('click', function (e) {
                    const hourContainer = shadow.querySelector('.hour-container');
                    const minuteContainer = shadow.querySelector('.minute-container');
                    const secondContainer = shadow.querySelector('.second-container');

                    const now = new Date();
                    hourContainer.querySelectorAll('li')[now.getHours()]?.classList.add('current');
                    minuteContainer.querySelectorAll('li')[now.getMinutes()]?.classList.add('current');
                    secondContainer.querySelectorAll('li')[now.getSeconds()]?.classList.add('current');

                    inputHour.textContent = now.getHours() < 10 ? '0' + now.getHours() : now.getHours();
                    inputMinute.textContent = now.getMinutes() < 10 ? '0' + now.getMinutes() : now.getMinutes();
                    inputSec.textContent = now.getSeconds() < 10 ? '0' + now.getSeconds() : now.getSeconds();
                    timeArea.classList.add('show');

                    hourContainer.closest('.time-container').scrollTop = now.getHours() * 32;
                    minuteContainer.closest('.time-container').scrollTop = now.getMinutes() * 32;
                    secondContainer.closest('.time-container').scrollTop = now.getSeconds() * 32;
                });

                shadow.querySelector('.reset-btn').addEventListener('click', function (e) {
                    const hourContainer = shadow.querySelector('.hour-container');
                    const minuteContainer = shadow.querySelector('.minute-container');
                    const secondContainer = shadow.querySelector('.second-container');

                    hourContainer.closest('.time-container').scrollTop = 0;
                    minuteContainer.closest('.time-container').scrollTop = 0;
                    secondContainer.closest('.time-container').scrollTop = 0;
                    setTimeout(() => {
                        timeArea.classList.remove('show');
                    }, 700);
                });

                shadow.querySelector('.time-selector').addEventListener('click', function (e) {
                    if (e.target.tagName === 'LI') {
                        let index = parseInt(e.target.getAttribute('t-index'));
                        e.target.closest('.time-container').scrollTop = 32 * index;
                        setInputTime(e.target.closest('.time-container').classList[1], index);
                    }
                });
            })();
        }

        genBaseHtml() {
            return `<div class="dt-picker-widget ${this.getAttribute('dark-mode')}">
                    <div class="date-input-area">
                        <p class="sr-only" role="alert" aria-automatic="true">Selected date is <span class="currentDate"></span></p>
                        <div class="calendar-box" aria-labelledby="${this.getAttribute('refer-id')}" role="group">
                            <input class="month" type="number" max="12" min="1" placeholder="MM" aria-label="Month" oninput="this.value=this.value.slice(0,2)">/
                            <input class="day" type="number" min="1" max="31" placeholder="DD" aria-label="Day">/
                            <input class="year" type="number" min="21" placeholder="YYYY" aria-label="Year" oninput="this.value=this.value.slice(0,4)">
                            <div class="time-area">
                                <span class="v-hour"></span>
                                <span class="v-min"></span>
                                <span class="v-sec"></span>
                            </div>
                            <a href="javascript:void(0)" role="button"><svg xmlns="http://www.w3.org/2000/svg" width="24px" height="24px" viewBox="0 0 24 24" fill="none"><rect width="24" height="24" fill="white"/><g filter="url(#filter0_d_15_268)"><path d="M3 8.26667V19C3 19.5523 3.44772 20 4 20H20C20.5523 20 21 19.5523 21 19V8.26667M3 8.26667V5C3 4.44772 3.44772 4 4 4H20C20.5523 4 21 4.44772 21 5V8.26667M3 8.26667H21" stroke="#368727" stroke-linejoin="round"/></g><g filter="url(#filter1_d_15_268)"><path d="M7 2V5" stroke="#368727" stroke-linecap="round" stroke-linejoin="round"/></g><g filter="url(#filter2_d_15_268)"><path d="M17 2V5" stroke="#368727" stroke-linecap="round" stroke-linejoin="round"/></g><g filter="url(#filter3_d_15_268)"><path d="M18 11H16" stroke="#368727" stroke-linecap="round" stroke-linejoin="round"/></g><g filter="url(#filter4_d_15_268)"><path d="M18 17H16" stroke="#368727" stroke-linecap="round" stroke-linejoin="round"/></g><g filter="url(#filter5_d_15_268)"><path d="M13 11H11" stroke="#368727" stroke-linecap="round" stroke-linejoin="round"/></g><g filter="url(#filter6_d_15_268)"><path d="M13 17H11" stroke="#368727" stroke-linecap="round" stroke-linejoin="round"/></g><g filter="url(#filter7_d_15_268)"><path d="M8 11H6" stroke="#368727" stroke-linecap="round" stroke-linejoin="round"/></g><g filter="url(#filter8_d_15_268)"><path d="M8 17H6" stroke="#368727" stroke-linecap="round" stroke-linejoin="round"/></g><g filter="url(#filter9_d_15_268)"><path d="M18 14H16" stroke="#368727" stroke-linecap="round" stroke-linejoin="round"/></g><g filter="url(#filter10_d_15_268)"><path d="M13 14H11" stroke="#368727" stroke-linecap="round" stroke-linejoin="round"/></g><g filter="url(#filter11_d_15_268)"><path d="M8 14H6" stroke="#368727" stroke-linecap="round" stroke-linejoin="round"/></g><defs><filter id="filter0_d_15_268" x="1.5" y="3.5" width="21" height="19" filterUnits="userSpaceOnUse" color-interpolation-filters="sRGB"><feFlood flood-opacity="0" result="BackgroundImageFix"/><feColorMatrix in="SourceAlpha" type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0" result="hardAlpha"/><feOffset dy="1"/><feGaussianBlur stdDeviation="0.5"/><feColorMatrix type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0.1 0"/><feBlend mode="normal" in2="BackgroundImageFix" result="effect1_dropShadow_15_268"/><feBlend mode="normal" in="SourceGraphic" in2="effect1_dropShadow_15_268" result="shape"/></filter><filter id="filter1_d_15_268" x="5.5" y="1.5" width="3" height="6" filterUnits="userSpaceOnUse" color-interpolation-filters="sRGB"><feFlood flood-opacity="0" result="BackgroundImageFix"/><feColorMatrix in="SourceAlpha" type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0" result="hardAlpha"/><feOffset dy="1"/><feGaussianBlur stdDeviation="0.5"/><feColorMatrix type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0.1 0"/><feBlend mode="normal" in2="BackgroundImageFix" result="effect1_dropShadow_15_268"/><feBlend mode="normal" in="SourceGraphic" in2="effect1_dropShadow_15_268" result="shape"/></filter><filter id="filter2_d_15_268" x="15.5" y="1.5" width="3" height="6" filterUnits="userSpaceOnUse" color-interpolation-filters="sRGB"><feFlood flood-opacity="0" result="BackgroundImageFix"/><feColorMatrix in="SourceAlpha" type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0" result="hardAlpha"/><feOffset dy="1"/><feGaussianBlur stdDeviation="0.5"/><feColorMatrix type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0.1 0"/><feBlend mode="normal" in2="BackgroundImageFix" result="effect1_dropShadow_15_268"/><feBlend mode="normal" in="SourceGraphic" in2="effect1_dropShadow_15_268" result="shape"/></filter><filter id="filter3_d_15_268" x="14.5" y="10.5" width="5" height="3" filterUnits="userSpaceOnUse" color-interpolation-filters="sRGB"><feFlood flood-opacity="0" result="BackgroundImageFix"/><feColorMatrix in="SourceAlpha" type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0" result="hardAlpha"/><feOffset dy="1"/><feGaussianBlur stdDeviation="0.5"/><feColorMatrix type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0.1 0"/><feBlend mode="normal" in2="BackgroundImageFix" result="effect1_dropShadow_15_268"/><feBlend mode="normal" in="SourceGraphic" in2="effect1_dropShadow_15_268" result="shape"/></filter><filter id="filter4_d_15_268" x="14.5" y="16.5" width="5" height="3" filterUnits="userSpaceOnUse" color-interpolation-filters="sRGB"><feFlood flood-opacity="0" result="BackgroundImageFix"/><feColorMatrix in="SourceAlpha" type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0" result="hardAlpha"/><feOffset dy="1"/><feGaussianBlur stdDeviation="0.5"/><feColorMatrix type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0.1 0"/><feBlend mode="normal" in2="BackgroundImageFix" result="effect1_dropShadow_15_268"/><feBlend mode="normal" in="SourceGraphic" in2="effect1_dropShadow_15_268" result="shape"/></filter><filter id="filter5_d_15_268" x="9.5" y="10.5" width="5" height="3" filterUnits="userSpaceOnUse" color-interpolation-filters="sRGB"><feFlood flood-opacity="0" result="BackgroundImageFix"/><feColorMatrix in="SourceAlpha" type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0" result="hardAlpha"/><feOffset dy="1"/><feGaussianBlur stdDeviation="0.5"/><feColorMatrix type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0.1 0"/><feBlend mode="normal" in2="BackgroundImageFix" result="effect1_dropShadow_15_268"/><feBlend mode="normal" in="SourceGraphic" in2="effect1_dropShadow_15_268" result="shape"/></filter><filter id="filter6_d_15_268" x="9.5" y="16.5" width="5" height="3" filterUnits="userSpaceOnUse" color-interpolation-filters="sRGB"><feFlood flood-opacity="0" result="BackgroundImageFix"/><feColorMatrix in="SourceAlpha" type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0" result="hardAlpha"/><feOffset dy="1"/><feGaussianBlur stdDeviation="0.5"/><feColorMatrix type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0.1 0"/><feBlend mode="normal" in2="BackgroundImageFix" result="effect1_dropShadow_15_268"/><feBlend mode="normal" in="SourceGraphic" in2="effect1_dropShadow_15_268" result="shape"/></filter><filter id="filter7_d_15_268" x="4.5" y="10.5" width="5" height="3" filterUnits="userSpaceOnUse" color-interpolation-filters="sRGB"><feFlood flood-opacity="0" result="BackgroundImageFix"/><feColorMatrix in="SourceAlpha" type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0" result="hardAlpha"/><feOffset dy="1"/><feGaussianBlur stdDeviation="0.5"/><feColorMatrix type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0.1 0"/><feBlend mode="normal" in2="BackgroundImageFix" result="effect1_dropShadow_15_268"/><feBlend mode="normal" in="SourceGraphic" in2="effect1_dropShadow_15_268" result="shape"/></filter><filter id="filter8_d_15_268" x="4.5" y="16.5" width="5" height="3" filterUnits="userSpaceOnUse" color-interpolation-filters="sRGB"><feFlood flood-opacity="0" result="BackgroundImageFix"/><feColorMatrix in="SourceAlpha" type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0" result="hardAlpha"/><feOffset dy="1"/><feGaussianBlur stdDeviation="0.5"/><feColorMatrix type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0.1 0"/><feBlend mode="normal" in2="BackgroundImageFix" result="effect1_dropShadow_15_268"/><feBlend mode="normal" in="SourceGraphic" in2="effect1_dropShadow_15_268" result="shape"/></filter><filter id="filter9_d_15_268" x="14.5" y="13.5" width="5" height="3" filterUnits="userSpaceOnUse" color-interpolation-filters="sRGB"><feFlood flood-opacity="0" result="BackgroundImageFix"/><feColorMatrix in="SourceAlpha" type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0" result="hardAlpha"/><feOffset dy="1"/><feGaussianBlur stdDeviation="0.5"/><feColorMatrix type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0.1 0"/><feBlend mode="normal" in2="BackgroundImageFix" result="effect1_dropShadow_15_268"/><feBlend mode="normal" in="SourceGraphic" in2="effect1_dropShadow_15_268" result="shape"/></filter><filter id="filter10_d_15_268" x="9.5" y="13.5" width="5" height="3" filterUnits="userSpaceOnUse" color-interpolation-filters="sRGB"><feFlood flood-opacity="0" result="BackgroundImageFix"/><feColorMatrix in="SourceAlpha" type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0" result="hardAlpha"/><feOffset dy="1"/><feGaussianBlur stdDeviation="0.5"/><feColorMatrix type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0.1 0"/><feBlend mode="normal" in2="BackgroundImageFix" result="effect1_dropShadow_15_268"/><feBlend mode="normal" in="SourceGraphic" in2="effect1_dropShadow_15_268" result="shape"/></filter><filter id="filter11_d_15_268" x="4.5" y="13.5" width="5" height="3" filterUnits="userSpaceOnUse" color-interpolation-filters="sRGB"><feFlood flood-opacity="0" result="BackgroundImageFix"/><feColorMatrix in="SourceAlpha" type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0" result="hardAlpha"/><feOffset dy="1"/><feGaussianBlur stdDeviation="0.5"/><feColorMatrix type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0.1 0"/><feBlend mode="normal" in2="BackgroundImageFix" result="effect1_dropShadow_15_268"/><feBlend mode="normal" in="SourceGraphic" in2="effect1_dropShadow_15_268" result="shape"/></filter></defs></svg></a>
                        </div>
                    </div>
                    <div class="year-month-picker">
                        <button aria-haspopup="dialog" class="drawer-btn">
                            <span class="year-month"></span>
                            <span class="picker-arrow" aria-label="year month picker arrow"></span>
                        </button>
                        <a href="javascript:void(0)" class="close-drawer"></a>
                        <div class="dropdown-drawer" role="dialog" aria-modal="true">
                            <div class="month-options"></div>
                            <div role="radiogroup" class="year-options scroll-shadows"></div>
                        </div>
                    </div>
                    <div class="container" role="application">
                        <div class="data-picker-header">
                            <div class="month-picker">
                                <a href="javascript:void(0)" class="left active" aria-label="previous month" role="button"></a>
                                <a href="javascript:void(0)" class="right active" aria-label="next month" role="button"></a>
                            </div>
                        </div>
                        <div class="date-items header"></div>
                        <div class="date-items body" role="group"></div>
                        <div class="button-container">
                            <a href="javascript:void(0)" role="button" class="clear-btn">Clear</a>
                            <a href="javascript:void(0)" role="button" class="today-btn">Today</a>
                        </div>
                        <div class="time-label"><span>Hours</span><span>Mins</span><span>Secs</span></div>
                        <div class="time-selector">
                            <div class="time-container h"><ul class="hour-container"></ul></div>
                            <div class="time-container m"><ul class="minute-container"></ul></div>
                            <div class="time-container s"><ul class="second-container"></ul></div>
                            <div class="separator"></div>
                        </div>
                        <div class="time-controller">
                            <a href="javascript:void(0)" role="button" class="reset-btn">Reset</a>
                            <a href="javascript:void(0)" role="button" class="now-btn">Now</a>
                        </div>
                    </div>
                </div>`;
        }

        genEle = (html) => {
            let temp = document.createElement('template');
            temp.innerHTML = html.trim();
            return temp.content.firstChild;
        };

        genStyle() {
            return this.getAttribute('style');
        }

        attributeChangedCallback(ns, oldValue, newValue) {
            if (oldValue !== newValue) {
                this.dispatchEvent(new Event('change', { bubbles: true }));
            }
        }
    },
);
