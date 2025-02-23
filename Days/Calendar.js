customElements.define("harley-calendar", class HarleyCalendar extends HTMLElement {
    static observedAttributes = ['dark-mode', 'ymd', 'refer-id', 'init-date', 'class', 'events'];

    connectedCallback() {
        const shadow = this.attachShadow({ mode: "open" });
        shadow.appendChild(this.genEle(this.genBaseHtml()));

        (async ()=>{
            const styleCode = await fetch('./index.css');
            const style = document.createElement('style');
            style.textContent = await styleCode.text();
            shadow.appendChild(style);
        })();

        const WeekArray = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
        const MonthArray = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
        let inputYear = shadow.querySelector('input.year');
        let inputMonth = shadow.querySelector('input.month');
        let inputDay = shadow.querySelector('input.day');
        let inProgress = false;
        let whichWay;

        let events = JSON.parse(this.getAttribute('events'));

        console.log(this.className)

        shadow.querySelector('.date-items.body').className += ' ' + this.className;

        // Event handler       
        (() => {
            shadow.querySelector('.date-items.body').addEventListener('focusin', e => {
                const item = e.target.closest('a');
                if (item) {
                    shadow.querySelector('.grid-container .active')?.classList.remove('active');
                    e.target.closest('a').classList.add('active');
                    updateDatePicker(item);
                }
            });

            shadow.querySelector('.date-items.body').addEventListener('keydown', e => {
                const index = e.target.getAttribute('data-index');
                e.stopImmediatePropagation();
                e.preventDefault();
                if (!inProgress) {
                    if (e.key === 'ArrowRight') {
                        let nextDate = e.target.nextElementSibling;
                        if (nextDate.classList.contains('nextMonth')) {
                            inProgress = true;
                            moveNext();
                            whichWay = 'nextDay';
                        } else {
                            nextDate.focus();
                        }
                    } else if (e.key === 'ArrowLeft') {
                        let preDate = e.target.previousElementSibling;
                        if (!preDate || preDate.classList.contains('preMonth')) {
                            inProgress = true;
                            movePrevious();
                            whichWay = 'preDay';
                        } else {
                            preDate.focus();
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
                            whichWay = 'preWeek';
                        } else {
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

            shadow.querySelector('.date-items.body').addEventListener('click', e => {
                const item = e.target.closest('a');
                if (item) {
                    drawerToggle();
                }
            });

            // input events handler input area events start
            shadow.querySelectorAll('.calendar-box input').forEach(item => {
                // update the day based on the month
                item.addEventListener('focus', e => {
                    let input = e.target;
                    if (input.classList.contains('day')) {
                        let year = inputYear.value ? inputYear.value : new Date().getFullYear();
                        let month = inputMonth.value ? inputMonth.value : '01';
                        let maxDay = getDays(year, month);
                        input.setAttribute('max', maxDay + "");
                        if (input.value > maxDay) input.value = maxDay;
                    }
                    shadow.querySelector('.dt-picker-widget').classList.add('active');
                });

                item.addEventListener('blur', e => {
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
                        if (input.value === "") {
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
                            if (e.key === 'ArrowDown' && input.value === '01'){
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
            shadow.querySelector('.today-btn').addEventListener('click', e => {
                const items = new Date().toLocaleDateString().split('/');
                resetInput(items)
                shadow.querySelector('.currentDate').textContent = new Date(parseInt(inputMonth.value) + '/' + parseInt(inputDay.value) + '/' + inputYear.value).toDateString();
                drawerToggle();
            });

            shadow.querySelector('.today-btn').addEventListener('keydown', e => {
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
            shadow.querySelector('.clear-btn').addEventListener('click', e => {
                shadow.querySelectorAll('.calendar-box input').forEach(item => {
                    item.value = '';
                });
                if (e.type !== 'click') {
                    shadow.querySelector('.calendar-box input').focus();
                }
                drawerToggle();
            });

            shadow.querySelector('.clear-btn').addEventListener('keydown', e => {
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

            // // year month picker start
            // shadow.querySelector('.year-month-picker .drawer-btn').addEventListener('keydown', (e) => {
            //     if (e.key === 'Tab' && e.shiftKey) {
            //         e.preventDefault();
            //         shadow.querySelector('.today-btn').focus();
            //     }
            // });

            // shadow.querySelector('.year-month-picker .drawer-btn').addEventListener('click', (e) => {
            //     shadow.querySelector('.year-month-picker').classList.toggle('expanded');
            //     let yearOption = '';
            //     for (let i = 1900; i <= 2100; i++) {
            //         yearOption += `<input type="radio" name="year-opt" value="${i}" id="year_opt_${i}" class="year-option" aria-label="${i}"/>`;
            //     }
            //     shadow.querySelector('.year-options').innerHTML = yearOption;
            //     let monthOptions = '';
            //     for (let i = 0; i < MonthArray.length; i++) {
            //         monthOptions += `<input type="radio" name="month-opt" value="${(i + 1) < 10 ? '0' + (i + 1) : i + 1}" id="month_opt_${i}" class="month-option" aria-label="${MonthArray[i].substring(0, 3)}"/>`;
            //     }
            //     shadow.querySelector('.month-options').innerHTML = monthOptions;
            //     // set Active Year and Month
            //     shadow.querySelector(`.month-options>input:nth-child(${new Date().getMonth() + 1})`).classList.add('current', 'active');
            //     shadow.querySelectorAll('.year-option').forEach(item => {
            //         console.log(parseInt(item.value),parseInt(new Date().getFullYear()) );
            //         if (parseInt(item.value) === parseInt(new Date().getFullYear())) {
            //             item.checked = true;
            //             item.classList.add('current');
            //         } else {
            //             item.checked = false;
            //             item.classList.remove('current');
            //         }
            //     });
            //     // scroll the Year into the first Row
            //     shadow.querySelector('.year-options').scrollTop = shadow.querySelector('.year-option.current').offsetTop - 88;
            // });

            shadow.querySelector('.year-month-picker .close-drawer').addEventListener('click', e => {
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
            resetInput(items);
        };

        const drawerToggle = () => {
            //shadow.querySelector('.date-items.body').innerHTML ='';
            shadow.querySelector('.dt-picker-widget').classList.toggle('show');
            shadow.querySelectorAll('.expanded,.active').forEach(item => {
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
                shadow.querySelector(`.grid-container:nth-child(2)>a.currentMonth[data-ymd="${currentDate.toLocaleDateString()}"]`).focus();
            } else {
                setTimeout(() => {
                    // reset it, use animation slide in
                    buildGridCode(topDate.getFullYear(), topDate.getMonth(), true);
                }, 0);

                // for animation to wait for 200ms
                setTimeout(() => {
                    shadow.querySelector(`.grid-container>.currentMonth[data-ymd="${currentDate.toLocaleDateString()}"]`).focus();
                }, 200);
            }
            // set which month and year
            shadow.querySelector('.year-month-picker .year-month').innerHTML = `<span>${MonthArray[currentDate.getMonth()]}</span>` + currentDate.getFullYear();
        }

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
                } else if (i > (dIndex - 1) && i < (days + dIndex)) {
                    whichMonth = 'currentMonth';
                } else {
                    whichMonth = 'nextMonth';
                }
                innerContent += `<a href="javascript:void(0)" role="cell" data-ymd="${current.toLocaleDateString()}" data-index="${i}"
                    class="${i === indexOfDay + dIndex - 1 && new Date().getMonth() === month && new Date().getFullYear() === year ? 'current active' : ''} ${whichMonth} ${events[current.toLocaleDateString()]?.hasEvent? 'events': ''} ${events[current.toLocaleDateString()]?.balance? 'hasBalance': ''}">
                        <span class="sr-only">${current.toDateString()}</span>
                        <div class="balance ${events[current.toLocaleDateString()]?.trend}">${events[current.toLocaleDateString()]?.balance? events[current.toLocaleDateString()]?.balance : ''}</div>
                        <span aria-hidden="true">${current.toLocaleDateString() !== new Date().toLocaleDateString()? current.getDate(): 'Today'}</span>
                        <div class="indicators">
                            ${events[current.toLocaleDateString()]?.hasAlert? '<div class="alert"><svg width="24px" height="24px" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><g clip-path="url(#clip0_15_159)"><rect width="24" height="24" fill="none"/><path d="M9.5 19C8.89555 19 7.01237 19 5.61714 19C4.87375 19 4.39116 18.2177 4.72361 17.5528L5.57771 15.8446C5.85542 15.2892 6 14.6774 6 14.0564C6 13.2867 6 12.1434 6 11C6 9 7 5 12 5C17 5 18 9 18 11C18 12.1434 18 13.2867 18 14.0564C18 14.6774 18.1446 15.2892 18.4223 15.8446L19.2764 17.5528C19.6088 18.2177 19.1253 19 18.382 19H14.5M9.5 19C9.5 21 10.5 22 12 22C13.5 22 14.5 21 14.5 19M9.5 19C11.0621 19 14.5 19 14.5 19" stroke="#fff" stroke-linejoin="round" stroke-width="3"/><path stroke-width="3" d="M12 5V3" stroke="#fff" stroke-linecap="round" stroke-linejoin="round"/></g><defs><clipPath id="clip0_15_159"><rect width="24" height="24" fill="white"/></clipPath></defs></svg></div>' : ''}
                            ${events[current.toLocaleDateString()]?.hasTransfer? '<div class="transfer"><svg width="24px" height="24px" viewBox="0 0 24 24" version="1.1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink"><g stroke="none" stroke-width="1" fill="none" fill-rule="evenodd"><g id="Arrow" transform="translate(-912.000000, 0.000000)" fill-rule="nonzero"><g id="transfer_line" transform="translate(912.000000, 0.000000)"><path d="M24,0 L24,24 L0,24 L0,0 L24,0 Z M12.5934901,23.257841 L12.5819402,23.2595131 L12.5108777,23.2950439 L12.4918791,23.2987469 L12.4918791,23.2987469 L12.4767152,23.2950439 L12.4056548,23.2595131 C12.3958229,23.2563662 12.3870493,23.2590235 12.3821421,23.2649074 L12.3780323,23.275831 L12.360941,23.7031097 L12.3658947,23.7234994 L12.3769048,23.7357139 L12.4804777,23.8096931 L12.4953491,23.8136134 L12.4953491,23.8136134 L12.5071152,23.8096931 L12.6106902,23.7357139 L12.6232938,23.7196733 L12.6232938,23.7196733 L12.6266527,23.7031097 L12.609561,23.275831 C12.6075724,23.2657013 12.6010112,23.2592993 12.5934901,23.257841 L12.5934901,23.257841 Z M12.8583906,23.1452862 L12.8445485,23.1473072 L12.6598443,23.2396597 L12.6498822,23.2499052 L12.6498822,23.2499052 L12.6471943,23.2611114 L12.6650943,23.6906389 L12.6699349,23.7034178 L12.6699349,23.7034178 L12.678386,23.7104931 L12.8793402,23.8032389 C12.8914285,23.8068999 12.9022333,23.8029875 12.9078286,23.7952264 L12.9118235,23.7811639 L12.8776777,23.1665331 C12.8752882,23.1545897 12.8674102,23.1470016 12.8583906,23.1452862 L12.8583906,23.1452862 Z M12.1430473,23.1473072 C12.1332178,23.1423925 12.1221763,23.1452606 12.1156365,23.1525954 L12.1099173,23.1665331 L12.0757714,23.7811639 C12.0751323,23.7926639 12.0828099,23.8018602 12.0926481,23.8045676 L12.108256,23.8032389 L12.3092106,23.7104931 L12.3186497,23.7024347 L12.3186497,23.7024347 L12.3225043,23.6906389 L12.340401,23.2611114 L12.337245,23.2485176 L12.337245,23.2485176 L12.3277531,23.2396597 L12.1430473,23.1473072 Z" id="MingCute" fill-rule="nonzero"></path><path d="M20,14 C20.5523,14 21,14.4477 21,15 C21,15.51285 20.613973,15.9355092 20.1166239,15.9932725 L20,16 L6.41421,16 L8.70711,18.2929 C9.09763,18.6834 9.09763,19.3166 8.70711,19.7071 C8.34662077,20.0675615 7.77939355,20.0952893 7.38709848,19.7902834 L7.29289,19.7071 L3.4636,15.8778 C2.7983584,15.212616 3.2240608,14.0940048 4.12621381,14.0055802 L4.24142,14 L20,14 Z M15.2929,4.29289 C15.6533615,3.93241 16.2206207,3.90468077 16.6128973,4.20970231 L16.7071,4.29289 L20.5364,8.12218 C21.20168,8.7874312 20.7759699,9.90599901 19.8738074,9.99442003 L19.7586,10 L4,10 C3.44772,10 3,9.55228 3,9 C3,8.48716857 3.38604429,8.06449347 3.88337975,8.0067278 L4,8 L17.5858,8 L15.2929,5.70711 C14.9024,5.31658 14.9024,4.68342 15.2929,4.29289 Z" fill="#fff"></path></g></g></g></svg></div>' : ''}
                            ${events[current.toLocaleDateString()]?.hasInvest? '<div class="invest"><svg xmlns="http://www.w3.org/2000/svg" fill="red" width="24px" height="24px" viewBox="0 0 24 24"><path d="M21.49 13.926l-3.273 2.48c.054-.663.116-1.435.143-2.275.04-.89.023-1.854-.043-2.835-.043-.487-.097-.98-.184-1.467-.077-.485-.196-.982-.31-1.39-.238-.862-.535-1.68-.9-2.35-.352-.673-.786-1.173-1.12-1.462-.172-.144-.31-.248-.414-.306l-.153-.093c-.083-.05-.187-.056-.275-.003-.13.08-.175.252-.1.388l.01.02s.11.198.258.54c.07.176.155.38.223.63.08.24.14.528.206.838.063.313.114.66.17 1.03l.15 1.188c.055.44.106.826.13 1.246.03.416.033.85.026 1.285.004.872-.063 1.76-.115 2.602-.062.853-.12 1.65-.172 2.335 0 .04-.004.073-.005.11l-.115-.118-2.996-3.028-1.6.454 5.566 6.66 6.394-5.803-1.503-.677z" style="&#10;    stroke: red;&#10;"/><path d="M2.503 9.48L5.775 7c-.054.664-.116 1.435-.143 2.276-.04.89-.023 1.855.043 2.835.043.49.097.98.184 1.47.076.484.195.98.31 1.388.237.862.534 1.68.9 2.35.35.674.785 1.174 1.12 1.463.17.145.31.25.413.307.1.06.152.093.152.093.083.05.187.055.275.003.13-.08.175-.252.1-.388l-.01-.02s-.11-.2-.258-.54c-.07-.177-.155-.38-.223-.63-.082-.242-.14-.528-.207-.84-.064-.312-.115-.658-.172-1.027-.046-.378-.096-.777-.15-1.19-.053-.44-.104-.825-.128-1.246-.03-.415-.033-.85-.026-1.285-.004-.872.063-1.76.115-2.603.064-.853.122-1.65.174-2.334 0-.04.004-.074.005-.11l.114.118 2.996 3.027 1.6-.454L7.394 3 1 8.804l1.503.678z"/></svg></div>' : ''}
                            
                        </div>
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

        const moveNext = () => {
            let nextMonth = getNextMonth();
            // set which month and year
            shadow.querySelector('.year-month-picker .year-month').innerHTML = `<span>${MonthArray[nextMonth.getMonth()]}</span> ${nextMonth.getFullYear()}`;
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
            shadow.querySelector(`.grid-container>.currentMonth[data-ymd="${current.toLocaleDateString()}"]`).focus();
            let currentElement = shadow.querySelector('.grid-container:nth-child(2)');
            currentElement.removeEventListener("transitionend", stopTransition);
        };

        // Transition related code for resolving the issue
        const addTransition = () => {
            let currentElement = shadow.querySelector('.grid-container:nth-child(2)');
            currentElement.addEventListener("transitionend", stopTransition);
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
                    shadow.querySelector('.currentDate').textContent = new Date(parseInt(month.value) + '/' + parseInt(day.value) + '/' + year.value).toLocaleDateString();
                }
            }, 50);
        };

        const resetInput = (items) =>{
            let year, month, day;

            if (items[0].length === 4){
                year = items[0];
                month = items[1];
                day = items[2];
            } else {
                year = items[2];
                day = items[1];
                month = items[0];
            }

            inputYear.value = year;
            inputMonth.value = parseInt(month) < 10 ? '0' + month : month;
            inputDay.value = parseInt(day) < 10 ? '0' + day : day;
        }

        initDateDrawer('init');
    }

    genBaseHtml() {
        return `<div class="dt-picker-widget ${this.getAttribute('dark-mode')} show">
                    <div class="date-input-area">
                        <p class="sr-only" role="alert" aria-automatic="true">Selected date is <span class="currentDate"></span></p>
                        <div class="calendar-box" aria-labelledby="${this.getAttribute('refer-id')}" role="group">
                            <input class="month" type="number" max="12" min="1" placeholder="MM" aria-label="Month" oninput="this.value=this.value.slice(0,2)">/
                            <input class="day" type="number" min="1" max="31" placeholder="DD" aria-label="Day">/
                            <input class="year" type="number" min="21" placeholder="YYYY" aria-label="Year" oninput="this.value=this.value.slice(0,4)">
                            <a href="javascript:void(0)" role="button" tabindex="-1"><svg xmlns="http://www.w3.org/2000/svg" width="24px" height="24px" viewBox="0 0 24 24" fill="none"><rect width="24" height="24" fill="white"/><g filter="url(#filter0_d_15_268)"><path d="M3 8.26667V19C3 19.5523 3.44772 20 4 20H20C20.5523 20 21 19.5523 21 19V8.26667M3 8.26667V5C3 4.44772 3.44772 4 4 4H20C20.5523 4 21 4.44772 21 5V8.26667M3 8.26667H21" stroke="#368727" stroke-linejoin="round"/></g><g filter="url(#filter1_d_15_268)"><path d="M7 2V5" stroke="#368727" stroke-linecap="round" stroke-linejoin="round"/></g><g filter="url(#filter2_d_15_268)"><path d="M17 2V5" stroke="#368727" stroke-linecap="round" stroke-linejoin="round"/></g><g filter="url(#filter3_d_15_268)"><path d="M18 11H16" stroke="#368727" stroke-linecap="round" stroke-linejoin="round"/></g><g filter="url(#filter4_d_15_268)"><path d="M18 17H16" stroke="#368727" stroke-linecap="round" stroke-linejoin="round"/></g><g filter="url(#filter5_d_15_268)"><path d="M13 11H11" stroke="#368727" stroke-linecap="round" stroke-linejoin="round"/></g><g filter="url(#filter6_d_15_268)"><path d="M13 17H11" stroke="#368727" stroke-linecap="round" stroke-linejoin="round"/></g><g filter="url(#filter7_d_15_268)"><path d="M8 11H6" stroke="#368727" stroke-linecap="round" stroke-linejoin="round"/></g><g filter="url(#filter8_d_15_268)"><path d="M8 17H6" stroke="#368727" stroke-linecap="round" stroke-linejoin="round"/></g><g filter="url(#filter9_d_15_268)"><path d="M18 14H16" stroke="#368727" stroke-linecap="round" stroke-linejoin="round"/></g><g filter="url(#filter10_d_15_268)"><path d="M13 14H11" stroke="#368727" stroke-linecap="round" stroke-linejoin="round"/></g><g filter="url(#filter11_d_15_268)"><path d="M8 14H6" stroke="#368727" stroke-linecap="round" stroke-linejoin="round"/></g><defs><filter id="filter0_d_15_268" x="1.5" y="3.5" width="21" height="19" filterUnits="userSpaceOnUse" color-interpolation-filters="sRGB"><feFlood flood-opacity="0" result="BackgroundImageFix"/><feColorMatrix in="SourceAlpha" type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0" result="hardAlpha"/><feOffset dy="1"/><feGaussianBlur stdDeviation="0.5"/><feColorMatrix type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0.1 0"/><feBlend mode="normal" in2="BackgroundImageFix" result="effect1_dropShadow_15_268"/><feBlend mode="normal" in="SourceGraphic" in2="effect1_dropShadow_15_268" result="shape"/></filter><filter id="filter1_d_15_268" x="5.5" y="1.5" width="3" height="6" filterUnits="userSpaceOnUse" color-interpolation-filters="sRGB"><feFlood flood-opacity="0" result="BackgroundImageFix"/><feColorMatrix in="SourceAlpha" type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0" result="hardAlpha"/><feOffset dy="1"/><feGaussianBlur stdDeviation="0.5"/><feColorMatrix type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0.1 0"/><feBlend mode="normal" in2="BackgroundImageFix" result="effect1_dropShadow_15_268"/><feBlend mode="normal" in="SourceGraphic" in2="effect1_dropShadow_15_268" result="shape"/></filter><filter id="filter2_d_15_268" x="15.5" y="1.5" width="3" height="6" filterUnits="userSpaceOnUse" color-interpolation-filters="sRGB"><feFlood flood-opacity="0" result="BackgroundImageFix"/><feColorMatrix in="SourceAlpha" type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0" result="hardAlpha"/><feOffset dy="1"/><feGaussianBlur stdDeviation="0.5"/><feColorMatrix type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0.1 0"/><feBlend mode="normal" in2="BackgroundImageFix" result="effect1_dropShadow_15_268"/><feBlend mode="normal" in="SourceGraphic" in2="effect1_dropShadow_15_268" result="shape"/></filter><filter id="filter3_d_15_268" x="14.5" y="10.5" width="5" height="3" filterUnits="userSpaceOnUse" color-interpolation-filters="sRGB"><feFlood flood-opacity="0" result="BackgroundImageFix"/><feColorMatrix in="SourceAlpha" type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0" result="hardAlpha"/><feOffset dy="1"/><feGaussianBlur stdDeviation="0.5"/><feColorMatrix type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0.1 0"/><feBlend mode="normal" in2="BackgroundImageFix" result="effect1_dropShadow_15_268"/><feBlend mode="normal" in="SourceGraphic" in2="effect1_dropShadow_15_268" result="shape"/></filter><filter id="filter4_d_15_268" x="14.5" y="16.5" width="5" height="3" filterUnits="userSpaceOnUse" color-interpolation-filters="sRGB"><feFlood flood-opacity="0" result="BackgroundImageFix"/><feColorMatrix in="SourceAlpha" type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0" result="hardAlpha"/><feOffset dy="1"/><feGaussianBlur stdDeviation="0.5"/><feColorMatrix type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0.1 0"/><feBlend mode="normal" in2="BackgroundImageFix" result="effect1_dropShadow_15_268"/><feBlend mode="normal" in="SourceGraphic" in2="effect1_dropShadow_15_268" result="shape"/></filter><filter id="filter5_d_15_268" x="9.5" y="10.5" width="5" height="3" filterUnits="userSpaceOnUse" color-interpolation-filters="sRGB"><feFlood flood-opacity="0" result="BackgroundImageFix"/><feColorMatrix in="SourceAlpha" type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0" result="hardAlpha"/><feOffset dy="1"/><feGaussianBlur stdDeviation="0.5"/><feColorMatrix type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0.1 0"/><feBlend mode="normal" in2="BackgroundImageFix" result="effect1_dropShadow_15_268"/><feBlend mode="normal" in="SourceGraphic" in2="effect1_dropShadow_15_268" result="shape"/></filter><filter id="filter6_d_15_268" x="9.5" y="16.5" width="5" height="3" filterUnits="userSpaceOnUse" color-interpolation-filters="sRGB"><feFlood flood-opacity="0" result="BackgroundImageFix"/><feColorMatrix in="SourceAlpha" type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0" result="hardAlpha"/><feOffset dy="1"/><feGaussianBlur stdDeviation="0.5"/><feColorMatrix type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0.1 0"/><feBlend mode="normal" in2="BackgroundImageFix" result="effect1_dropShadow_15_268"/><feBlend mode="normal" in="SourceGraphic" in2="effect1_dropShadow_15_268" result="shape"/></filter><filter id="filter7_d_15_268" x="4.5" y="10.5" width="5" height="3" filterUnits="userSpaceOnUse" color-interpolation-filters="sRGB"><feFlood flood-opacity="0" result="BackgroundImageFix"/><feColorMatrix in="SourceAlpha" type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0" result="hardAlpha"/><feOffset dy="1"/><feGaussianBlur stdDeviation="0.5"/><feColorMatrix type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0.1 0"/><feBlend mode="normal" in2="BackgroundImageFix" result="effect1_dropShadow_15_268"/><feBlend mode="normal" in="SourceGraphic" in2="effect1_dropShadow_15_268" result="shape"/></filter><filter id="filter8_d_15_268" x="4.5" y="16.5" width="5" height="3" filterUnits="userSpaceOnUse" color-interpolation-filters="sRGB"><feFlood flood-opacity="0" result="BackgroundImageFix"/><feColorMatrix in="SourceAlpha" type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0" result="hardAlpha"/><feOffset dy="1"/><feGaussianBlur stdDeviation="0.5"/><feColorMatrix type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0.1 0"/><feBlend mode="normal" in2="BackgroundImageFix" result="effect1_dropShadow_15_268"/><feBlend mode="normal" in="SourceGraphic" in2="effect1_dropShadow_15_268" result="shape"/></filter><filter id="filter9_d_15_268" x="14.5" y="13.5" width="5" height="3" filterUnits="userSpaceOnUse" color-interpolation-filters="sRGB"><feFlood flood-opacity="0" result="BackgroundImageFix"/><feColorMatrix in="SourceAlpha" type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0" result="hardAlpha"/><feOffset dy="1"/><feGaussianBlur stdDeviation="0.5"/><feColorMatrix type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0.1 0"/><feBlend mode="normal" in2="BackgroundImageFix" result="effect1_dropShadow_15_268"/><feBlend mode="normal" in="SourceGraphic" in2="effect1_dropShadow_15_268" result="shape"/></filter><filter id="filter10_d_15_268" x="9.5" y="13.5" width="5" height="3" filterUnits="userSpaceOnUse" color-interpolation-filters="sRGB"><feFlood flood-opacity="0" result="BackgroundImageFix"/><feColorMatrix in="SourceAlpha" type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0" result="hardAlpha"/><feOffset dy="1"/><feGaussianBlur stdDeviation="0.5"/><feColorMatrix type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0.1 0"/><feBlend mode="normal" in2="BackgroundImageFix" result="effect1_dropShadow_15_268"/><feBlend mode="normal" in="SourceGraphic" in2="effect1_dropShadow_15_268" result="shape"/></filter><filter id="filter11_d_15_268" x="4.5" y="13.5" width="5" height="3" filterUnits="userSpaceOnUse" color-interpolation-filters="sRGB"><feFlood flood-opacity="0" result="BackgroundImageFix"/><feColorMatrix in="SourceAlpha" type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0" result="hardAlpha"/><feOffset dy="1"/><feGaussianBlur stdDeviation="0.5"/><feColorMatrix type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0.1 0"/><feBlend mode="normal" in2="BackgroundImageFix" result="effect1_dropShadow_15_268"/><feBlend mode="normal" in="SourceGraphic" in2="effect1_dropShadow_15_268" result="shape"/></filter></defs></svg></a>
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
                    </div>
                </div>`;
    };

    genEle = (html) => {
        let temp = document.createElement('template');
        temp.innerHTML = html.trim();
        return temp.content.firstChild;
    };

    attributeChangedCallback(name, oldValue, newValue) {
        if (oldValue!== newValue) {
            this.dispatchEvent(new Event('change', { bubbles: true }));
        }

        if (name === 'class' && oldValue) {
            this.shadowRoot.querySelector('.date-items.body').className = 'date-items body ' + this.className;
        }

        // if (name === 'class' && oldValue) {
        //     if (!newValue.includes('showBalance')) {
        //         this.shadowRoot.querySelector('.date-items.body').classList.remove('showBalance');
        //     } else  {
        //         this.shadowRoot.querySelector('.date-items.body').classList.add('showBalance');
        //     }
        // }

    };
});