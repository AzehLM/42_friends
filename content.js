// Calculate Easter date for a given year (Computus algorithm)
function getEasterDate(year) {
    const a = year % 19;
    const b = Math.floor(year / 100);
    const c = year % 100;
    const d = Math.floor(b / 4);
    const e = b % 4;
    const f = Math.floor((b + 8) / 25);
    const g = Math.floor((b - f + 1) / 3);
    const h = (19 * a + b - d - g + 15) % 30;
    const i = Math.floor(c / 4);
    const k = c % 4;
    const l = (32 + 2 * e + 2 * i - h - k) % 7;
    const m = Math.floor((a + 11 * h + 22 * l) / 451);
    const month = Math.floor((h + l - 7 * m + 114) / 31);
    const day = ((h + l - 7 * m + 114) % 31) + 1;
    return new Date(year, month - 1, day);
}

// Get France public holidays for a given year
function getFrancePublicHolidays(year) {
    const holidays = [];

    // Fixed holidays
    holidays.push(new Date(year, 0, 1));   // New Year's Day
    holidays.push(new Date(year, 4, 1));   // Labour Day
    holidays.push(new Date(year, 4, 8));   // Victory in Europe Day
    holidays.push(new Date(year, 6, 14));  // Bastille Day
    holidays.push(new Date(year, 7, 15));  // Assumption of Mary
    holidays.push(new Date(year, 10, 1));  // All Saints' Day
    holidays.push(new Date(year, 10, 11)); // Armistice Day
    holidays.push(new Date(year, 11, 25)); // Christmas Day

    // Easter-based holidays
    const easter = getEasterDate(year);
    const easterMonday = new Date(easter);
    easterMonday.setDate(easter.getDate() + 1);
    holidays.push(easterMonday); // Easter Monday

    const ascension = new Date(easter);
    ascension.setDate(easter.getDate() + 39);
    holidays.push(ascension); // Ascension Day

    const pentecostMonday = new Date(easter);
    pentecostMonday.setDate(easter.getDate() + 50);
    holidays.push(pentecostMonday); // Whit Monday

    return holidays;
}

// Get the days to remove for current month from localStorage
function getDaysToRemove() {
    const now = new Date();
    const key = `days_to_remove_${now.getFullYear()}_${now.getMonth()}`;
    return parseInt(localStorage.getItem(key)) || 0;
}

// Save days to remove for current month
function setDaysToRemove(days) {
    const now = new Date();
    const key = `days_to_remove_${now.getFullYear()}_${now.getMonth()}`;
    localStorage.setItem(key, days);
}

// Calculate working days in current month (excluding weekends and France public holidays)
function getWorkingDaysInMonth() {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth();

    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);

    const holidays = getFrancePublicHolidays(year);
    const holidayStrings = holidays.map(h => h.toISOString().split('T')[0]);

    let workingDays = 0;

    for (let day = 1; day <= lastDay.getDate(); day++) {
        const currentDate = new Date(year, month, day);
        const dayOfWeek = currentDate.getDay();
        const dateString = currentDate.toISOString().split('T')[0];

        if (dayOfWeek === 0 || dayOfWeek === 6) continue;

        if (holidayStrings.includes(dateString)) continue;

        workingDays++;
    }

    return workingDays - getDaysToRemove();
}

function getProgressColor(ratio) {
    ratio = Math.max(0, Math.min(1, ratio));

    // Color palette from warm to cool tones
    const colors = [
        { r: 255, g: 250, b: 230 }, // Cosmic Latte #FFFAE6
        { r: 249, g: 236, b: 217 }, // Antique White #F9ECD9
        { r: 247, g: 227, b: 204 }, // Champagne #F7E3CC
        { r: 247, g: 206, b: 226 }, // Classic Rose #F7CEE2
        { r: 204, g: 202, b: 240 }, // Soap #CCCAF0
        { r: 171, g: 235, b: 180 }  // Darker Azure (darker than #CFDFEF)
    ];

    // Calculate which two colors to interpolate between
    const scaledRatio = ratio * (colors.length - 1);
    const lowerIndex = Math.floor(scaledRatio);
    const upperIndex = Math.min(lowerIndex + 1, colors.length - 1);
    const localRatio = scaledRatio - lowerIndex;

    // Interpolate between the two colors
    const lower = colors[lowerIndex];
    const upper = colors[upperIndex];

    const r = Math.round(lower.r + (upper.r - lower.r) * localRatio);
    const g = Math.round(lower.g + (upper.g - lower.g) * localRatio);
    const b = Math.round(lower.b + (upper.b - lower.b) * localRatio);

    return `rgb(${r}, ${g}, ${b})`;
}

async function displayLogtime(depth = 0) {
    const container = document.getElementById("user-locations");
    if (!container) return;

    const element = container.children.item(container.children.length - 1);
    let logtimeValue = element?.getAttribute("data-original-title");

    if (depth < 10 && (!element || logtimeValue === "0h00 (0h00)" || logtimeValue === "0h00")) {
        setTimeout(() => displayLogtime(depth + 1), 1000);
        return;
    }

    let containerAvailability = document.getElementById("attendance_container");

    // Check for test override
    // const testHours = localStorage.getItem("test_monthly_hours");
    // if (testHours) {
    //     const testMinutes = localStorage.getItem("test_monthly_minutes") || "0";
    //     logtimeValue = `5h30 (${testHours}h${testMinutes.padStart(2, '0')})`;
    // }

    const logtimeText = document.createElement("div");
    logtimeText.style.cssText = "width: 100%; text-align: center; font-size: 12px; padding-top: 5px; padding-left: 30px;";

    // Parse the daily logtime value
    let dailyTime = "0h00";
    if (logtimeValue) {
        if (logtimeValue.includes("(")) {
            const parts = logtimeValue.match(/^(.+?)\s*\((.+?)\)$/);
            if (parts) {
                dailyTime = parts[1]; // e.g., "5h30"
            }
        } else {
            dailyTime = logtimeValue;
        }
    }

    try {
        const userLoginElement = document.querySelector('.user-primary');
        const userLogin = userLoginElement ? userLoginElement.textContent.trim().split('\n').filter(line => line.trim()).pop() : null;

        console.log("TEST\n" + userLogin);

        if (!userLogin) {
            logtimeText.textContent = `Current Logtime ${dailyTime} (N/A)`;
            containerAvailability.appendChild(logtimeText);
            return;
        }

        const log_time_object = await fetch(`https://translate.intra.42.fr/users/${userLogin}/locations_stats.json`, {
            credentials: "include",
        }).then(res => res.json());

        const today = new Date();
        const year = today.getFullYear();
        const month = today.getMonth();

        const firstDayOfMonth = new Date(year, month, 1);
        let totalMonthlyMinutes = 0;

        for (let day = 1; day <= today.getDate(); day++) {
            const dateString = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

            if (log_time_object[dateString]) {
                const timeMatch = log_time_object[dateString].match(/^(\d+):(\d+):(\d+)/);
                if (timeMatch) {
                    const hours = parseInt(timeMatch[1]);
                    const minutes = parseInt(timeMatch[2]);
                    totalMonthlyMinutes += hours * 60 + minutes;
                }
            }
        }

        const monthlyHours = Math.floor(totalMonthlyMinutes / 60);
        const monthlyMinutes = totalMonthlyMinutes % 60;
        const monthlyTime = `${monthlyHours}h${monthlyMinutes.toString().padStart(2, '0')}`;

        const totalMonthlyHoursDecimal = monthlyHours + monthlyMinutes / 60;
        const workingDays = getWorkingDaysInMonth();
        const requiredHours = workingDays * 7;
        // console.log("required hours: " + requiredHours); /* debug */
        const ratio = totalMonthlyHoursDecimal / requiredHours;
        const color = getProgressColor(ratio);

        logtimeText.textContent = `Current Logtime ${dailyTime} (`;

        const dropdownContainer = document.createElement("span");
        dropdownContainer.className = "dropdown";
        dropdownContainer.style.position = "relative";
        dropdownContainer.style.display = "inline-block";

        const monthlySpan = document.createElement("span");
        monthlySpan.style.color = color;
        monthlySpan.style.fontWeight = "bold";
        monthlySpan.style.cursor = "pointer";
        monthlySpan.style.transition = "opacity 0.2s";
        monthlySpan.textContent = monthlyTime;
        monthlySpan.addEventListener("mouseover", () => monthlySpan.style.opacity = "0.7");
        monthlySpan.addEventListener("mouseout", () => monthlySpan.style.opacity = "1");

        const dropdownMenu = document.createElement("div");
        dropdownMenu.style.cssText = `
            display: none;
            position: absolute;
            bottom: 100%;
            left: 50%;
            transform: translateX(-50%);
            background-color: #1e2229;
            border: 1px solid #373c48;
            border-radius: 5px;
            padding: 12px;
            min-width: 200px;
            z-index: 1000;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
            margin-bottom: 8px;
        `;

        const dropdownTitle = document.createElement("div");
        dropdownTitle.style.cssText = "color: #f2f2f2; font-size: 12px; margin-bottom: 8px; font-weight: bold;";
        dropdownTitle.textContent = "Adjust Days Off";

        const infoDisplay = document.createElement("div");
        infoDisplay.style.cssText = "color: #888; font-size: 11px; margin-bottom: 10px;";
        const baseWorkingDays = workingDays + getDaysToRemove();
        infoDisplay.innerHTML = `Working days: ${baseWorkingDays}<br>After adjustment: ${workingDays}`;

        const inputContainer = document.createElement("div");
        inputContainer.style.cssText = "display: flex; align-items: center; gap: 8px;";

        const inputLabel = document.createElement("span");
        inputLabel.style.cssText = "color: #f2f2f2; font-size: 12px;";
        inputLabel.textContent = "Days off:";

        const daysInput = document.createElement("input");
        daysInput.type = "number";
        daysInput.min = "0";
        daysInput.max = String(baseWorkingDays);
        daysInput.value = getDaysToRemove();
        daysInput.style.cssText = `
            width: 60px;
            padding: 5px 8px;
            color: white;
            background-color: #373c48;
            border: 1px solid #4a4f5a;
            border-radius: 4px;
            outline: none;
            font-size: 12px;
            text-align: center;
        `;
        daysInput.addEventListener("focus", () => daysInput.style.borderColor = "#4a90e2");
        daysInput.addEventListener("blur", () => daysInput.style.borderColor = "#4a4f5a");

        const saveButton = document.createElement("button");
        saveButton.textContent = "Save";
        saveButton.style.cssText = `
            padding: 5px 12px;
            background-color: #4a90e2;
            color: white;
            border: none;
            border-radius: 4px;
            cursor: pointer;
            font-size: 12px;
            transition: background-color 0.2s;
        `;
        saveButton.addEventListener("mouseover", () => saveButton.style.backgroundColor = "#3a7bc8");
        saveButton.addEventListener("mouseout", () => saveButton.style.backgroundColor = "#4a90e2");

        saveButton.onclick = (e) => {
            e.stopPropagation();
            const days = Math.max(0, Math.min(parseInt(daysInput.value) || 0, baseWorkingDays));
            setDaysToRemove(days);
            location.reload();
        };

        daysInput.addEventListener("keydown", (e) => {
            if (e.key === "Enter") {
                saveButton.click();
            }
            e.stopPropagation();
        });

        inputContainer.appendChild(inputLabel);
        inputContainer.appendChild(daysInput);
        inputContainer.appendChild(saveButton);

        dropdownMenu.appendChild(dropdownTitle);
        dropdownMenu.appendChild(infoDisplay);
        dropdownMenu.appendChild(inputContainer);

        monthlySpan.onclick = (e) => {
            e.stopPropagation();
            const isVisible = dropdownMenu.style.display === "block";
            dropdownMenu.style.display = isVisible ? "none" : "block";
            if (!isVisible) {
                setTimeout(() => daysInput.focus(), 10);
            }
        };

        document.addEventListener("click", (e) => {
            if (!dropdownContainer.contains(e.target)) {
                dropdownMenu.style.display = "none";
            }
        });

        dropdownContainer.appendChild(monthlySpan);
        dropdownContainer.appendChild(dropdownMenu);

        logtimeText.appendChild(dropdownContainer);
        logtimeText.appendChild(document.createTextNode(")"));

        addTooltipOnHover(monthlySpan, "Click to adjust days off");

    } catch (error) {
        console.error("Error fetching monthly logtime:", error);
        logtimeText.textContent = `Current Logtime ${dailyTime} (Error loading monthly data)`;
    }

    containerAvailability.appendChild(logtimeText);
}

function getMondayAndSunday(dateStr) {
    const date = new Date(dateStr);
    const day = date.getDay();
    const diffToMonday = (day === 0 ? -6 : 1) - day;

    const monday = new Date(date);
    monday.setDate(date.getDate() + diffToMonday);

    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);

    const format = (d) => d.toISOString().split('T')[0];

    return {
        monday: format(monday),
        sunday: format(sunday),
    };
}

function getDateRange(startDate, endDate) {
    const dateArray = [];
    let currentDate = new Date(startDate);

    while (currentDate <= new Date(endDate)) {
        dateArray.push(new Date(currentDate).toISOString().split('T')[0]);
        currentDate.setDate(currentDate.getDate() + 1);
    }

    return dateArray;
}

function addTooltipOnHover(element, title) {
    // Créer le tooltip (mais ne pas l'ajouter directement au DOM)
    const tooltip = document.createElement("div");
    tooltip.textContent = title;
    tooltip.style.position = "absolute";
    tooltip.style.padding = "4px 8px";
    tooltip.style.backgroundColor = "black";
    tooltip.style.color = "white";
    tooltip.style.borderRadius = "4px";
    tooltip.style.fontSize = "12px";
    tooltip.style.pointerEvents = "none";
    tooltip.style.whiteSpace = "nowrap";
    tooltip.style.zIndex = "1000";
    tooltip.style.display = "none";
    document.body.appendChild(tooltip);

    // Positionner le tooltip lors du hover
    const onMouseEnter = (e) => {
      tooltip.style.display = "block";
      const rect = element.getBoundingClientRect();
      tooltip.style.left = `${rect.left + window.scrollX}px`;
      tooltip.style.top = `${rect.top + window.scrollY - tooltip.offsetHeight - 6}px`;
    };

    const onMouseLeave = () => {
      tooltip.style.display = "none";
    };

    const onMouseMove = (e) => {
      tooltip.style.left = `${e.pageX + 10}px`;
      tooltip.style.top = `${e.pageY + 10}px`;
    };

    // Ajouter les listeners sans supprimer les autres
    element.addEventListener("mouseenter", onMouseEnter);
    element.addEventListener("mouseleave", onMouseLeave);
    element.addEventListener("mousemove", onMouseMove);

    return tooltip
  }

function getFriendList() {
    const stored = localStorage.getItem("friend_list");
    if (stored) {
        try {
            return JSON.parse(stored);
        } catch (e) {
            console.error("Failed to parse friend list from localStorage");
        }
    }
    return [];
}

function saveFriendList(list) {
    localStorage.setItem("friend_list", JSON.stringify(list));
}

// Cache management functions
const CACHE_EXPIRY_MS = 5 * 60 * 1000; // 5 minutes

function getCachedFriendData(friend) {
    const cacheKey = `friend_cache_${friend}`;
    const cached = localStorage.getItem(cacheKey);

    if (!cached) return null;

    try {
        const { data, timestamp } = JSON.parse(cached);
        const age = Date.now() - timestamp;

        if (age < CACHE_EXPIRY_MS) {
            return data;
        } else {
            localStorage.removeItem(cacheKey);
            return null;
        }
    } catch (e) {
        localStorage.removeItem(cacheKey);
        return null;
    }
}

function setCachedFriendData(friend, data) {
    const cacheKey = `friend_cache_${friend}`;
    const cacheData = {
        data: data,
        timestamp: Date.now()
    };
    localStorage.setItem(cacheKey, JSON.stringify(cacheData));
}

function clearFriendCache(friend) {
    if (friend) {
        localStorage.removeItem(`friend_cache_${friend}`);
    } else {
        // Clear all friend caches
        const keys = Object.keys(localStorage);
        keys.forEach(key => {
            if (key.startsWith('friend_cache_')) {
                localStorage.removeItem(key);
            }
        });
    }
}

// Fetch friend data with caching and retry logic
async function fetchFriendData(friend, retries = 2) {
    // Check cache first
    const cached = getCachedFriendData(friend);
    if (cached) {
        return cached;
    }

    // Fetch with retry logic
    for (let attempt = 0; attempt <= retries; attempt++) {
        try {
            const URL = "https://profile.intra.42.fr/users/" + friend;
            const friend_object = await fetch(URL, { credentials: "include" }).then(res => res.json());

            if (!Object.keys(friend_object).length) {
                return null; // Invalid friend
            }

            const log_time_object = await fetch(`https://translate.intra.42.fr/users/${friend}/locations_stats.json`, {
                credentials: "include",
            }).then(res => res.json());

            const data = { friend, friend_object, log_time_object };

            // Cache the successful result
            setCachedFriendData(friend, data);

            return data;
        } catch (error) {
            if (attempt === retries) {
                console.warn(`Failed to load data for ${friend} after ${retries + 1} attempts:`, error);
                throw error;
            }
            // Wait before retrying (exponential backoff)
            await new Promise(resolve => setTimeout(resolve, 1000 * (attempt + 1)));
        }
    }
}

function displayFriend(content, friend, date_range, today, friend_object, log_time_object) {
    try {
        const URL = "https://profile.intra.42.fr/users/" + friend;

        const item = document.createElement("div");
        item.style = "display:flex;align-items:center;gap:10px;margin-bottom:.5rem;cursor:pointer;transition:background 0.2s ease;padding: 5px; border-radius: 10px;";
        item.addEventListener("mouseover", () => item.style.background = "#15181e");
        item.addEventListener("mouseout", () => item.style.background = "transparent");
        item.addEventListener("click", () => window.open(URL, "_blank"));

        const photo = document.createElement("div");
        photo.className = "user-profile-picture visible-sidebars";
        photo.style = `
            background-image: url(${friend_object.image.link});
            background-size: cover;
            width: 40px;
            height: 40px;
            border-radius: 50%;
            background-position: 50% 50%;
        `;

        const login = document.createElement("div");
        login.textContent = friend;

        // Display daily logtime or last seen
        const infoDisplay = document.createElement("div");

        if (log_time_object[today]) {
            const [dailyHours, dailyMinutes] = log_time_object[today].split(':');
            infoDisplay.textContent = "(" + dailyHours + "h" + (dailyMinutes || "00") + ")";
        } else {
            infoDisplay.textContent = "(0h00)";
        }


        const clusterPosition = document.createElement("div");
        clusterPosition.style = "margin-left: auto; margin-right: 10px; font-size: 14px; color: #b8b8b8;";
        if (friend_object.location) {
            clusterPosition.textContent = friend_object.location;
            clusterPosition.style.cursor = "pointer";
            clusterPosition.style.color = "#4a90e2";
            clusterPosition.onclick = (event) => {
                event.stopPropagation();
                window.open("https://meta.intra.42.fr/clusters#" + friend_object.location, "_blank");
            };
            addTooltipOnHover(clusterPosition, "Click to view on cluster map");
        } else {
            clusterPosition.textContent = "Offline";
        }

        const optionContainer = document.createElement("div");
        optionContainer.style = `display: flex;`;


        const connectionPellet = document.createElement("div");
        connectionPellet.style = `width: 12px; aspect-ratio: 1/1; background-color: ${friend_object.location ? "green" : "red"}; border-radius: 50%;`;

        const gapDiv = document.createElement("div");
        gapDiv.style = "height: 100%; width: 0; transition: all .5s;"

        const deleteFriend = document.createElement("div");
        deleteFriend.style = `
          width: 0;
          height: 12px;
          border-radius: 50%;
          margin-right: 1rem;
          transition: all .5s;
          display: flex;
          align-items: center;
          justify-content: center;
          background-color: transparent;
          cursor: pointer;
        `;

        const crossSVG = `
        <svg fill="white" viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg">
          <g id="SVGRepo_iconCarrier">
            <path d="M18.8,16l5.5-5.5c0.8-0.8,0.8-2,0-2.8l0,0C24,7.3,23.5,7,23,7c-0.5,0-1,0.2-1.4,0.6L16,13.2l-5.5-5.5 c-0.8-0.8-2.1-0.8-2.8,0C7.3,8,7,8.5,7,9.1s0.2,1,0.6,1.4l5.5,5.5l-5.5,5.5C7.3,21.9,7,22.4,7,23c0,0.5,0.2,1,0.6,1.4 C8,24.8,8.5,25,9,25c0.5,0,1-0.2,1.4-0.6l5.5-5.5l5.5,5.5c0.8,0.8,2.1,0.8,2.8,0c0.8-0.8,0.8-2.1,0-2.8L18.8,16z"></path>
          </g>
        </svg>
        `;

        const parser = new DOMParser();
        const svgDoc = parser.parseFromString(crossSVG, "image/svg+xml");
        deleteFriend.appendChild(svgDoc.documentElement);
        const deleteFriendTooltip = addTooltipOnHover(deleteFriend, "Delete Friend")
        deleteFriend.onclick = (event) => {
            event.stopPropagation();

            if (!confirm(`Are you sure you want to delete ${friend} from your friend list?`)) return;

            const updatedList = getFriendList().filter(val => val !== friend);
            saveFriendList(updatedList);

            deleteFriendTooltip.remove()
            item.remove();

            if (updatedList.length === 0) {
                const content = item.parentElement;
                const noFriendContainer = document.createElement("div")
                noFriendContainer.style = "width: 100%; height: 100%; padding: 3rem;"

                const noFriend = document.createElement("div")
                noFriend.style = "width: 100%; height: 100%; border: 5px #f2f2f2 dashed; border-radius: 10px; display: flex; align-items: center; justify-content: center; color: #f2f2f2; font-family: arial; font-size: 20px"
                noFriend.textContent = "Add friends to show them here"

                noFriendContainer.appendChild(noFriend)
                content.appendChild(noFriendContainer)
            }
        };

        optionContainer.addEventListener("mouseenter", () => {
            gapDiv.style.width = "10px";
            deleteFriend.style.width = "20px";
        });

        optionContainer.addEventListener("mouseleave", () => {
            gapDiv.style.width = "0";
            deleteFriend.style.width = "0";
        });

        item.appendChild(photo);
        item.appendChild(login);
        item.appendChild(infoDisplay);
        item.appendChild(clusterPosition);
        optionContainer.appendChild(deleteFriend)
        optionContainer.appendChild(gapDiv)
        optionContainer.appendChild(connectionPellet)
        item.appendChild(optionContainer);
        content.appendChild(item);
    } catch (error) {
        console.warn(`Failed to load data for ${friend}:`, error);
    }
}

// Helper function to render friends list
async function renderFriendsList(content, sortPreference) {
    const today = new Date().toISOString().split('T')[0];
    const { monday, sunday } = getMondayAndSunday(today);
    const date_range = getDateRange(monday, sunday);

    let FRIEND_LIST = getFriendList();

    // Clear content
    content.innerHTML = '';

    // Show loading indicator
    const loadingDiv = document.createElement("div");
    loadingDiv.style = "display: flex; flex-direction: column; align-items: center; justify-content: center; height: 200px; color: #f2f2f2;";

    const loadingText = document.createElement("div");
    loadingText.style = "font-size: 16px; margin-bottom: 10px;";
    loadingText.textContent = "Loading friends...";

    const spinner = document.createElement("div");
    spinner.style = "width: 30px; height: 30px; border: 3px solid #f2f2f2; border-top: 3px solid transparent; border-radius: 50%; animation: spin 1s linear infinite;";

    const style = document.createElement("style");
    style.textContent = "@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }";

    loadingDiv.appendChild(loadingText);
    loadingDiv.appendChild(spinner);
    loadingDiv.appendChild(style);

    content.appendChild(loadingDiv);

    if (!FRIEND_LIST.length) {
        content.innerHTML = '';
        const noFriendContainer = document.createElement("div");
        noFriendContainer.style = "width: 100%; height: 100%; padding: 3rem;";

        const noFriend = document.createElement("div");
        noFriend.style = "width: 100%; height: 100%; border: 5px #f2f2f2 dashed; border-radius: 10px; display: flex; align-items: center; justify-content: center; color: #f2f2f2; font-family: arial; font-size: 20px";
        noFriend.textContent = "Add friends to show them here";

        noFriendContainer.appendChild(noFriend);
        content.appendChild(noFriendContainer);
        return;
    }

    try {
        // Fetch all friend data in parallel with caching and retry
        const friendPromises = FRIEND_LIST.map(friend => fetchFriendData(friend));
        const results = await Promise.all(friendPromises);
        const friendDataList = results.filter(data => data !== null);

        // Clean up invalid friends from storage
        if (friendDataList.length !== FRIEND_LIST.length) {
            const validFriends = friendDataList.map(data => data.friend);
            saveFriendList(validFriends);
            FRIEND_LIST = validFriends;
        }

        // Sort friends
        switch (sortPreference) {
            case "Alphabetical (A-Z)":
                friendDataList.sort((a, b) => a.friend.localeCompare(b.friend));
                break;
            case "Alphabetical (Z-A)":
                friendDataList.sort((a, b) => b.friend.localeCompare(a.friend));
                break;
            case "Online First":
                friendDataList.sort((a, b) => (b.friend_object.location ? 1 : 0) - (a.friend_object.location ? 1 : 0));
                break;
            case "Offline First":
                friendDataList.sort((a, b) => (a.friend_object.location ? 1 : 0) - (b.friend_object.location ? 1 : 0));
                break;
        }

        // Clear loading indicator
        content.innerHTML = '';

        // Display friends
        for (const { friend, friend_object, log_time_object } of friendDataList) {
            displayFriend(content, friend, date_range, today, friend_object, log_time_object);
        }

    } catch (error) {
        const errorDiv = document.createElement("div");
        errorDiv.style = "display: flex; flex-direction: column; align-items: center; justify-content: center; height: 200px; color: #f2f2f2; padding: 20px; text-align: center;";

        const errorTitle = document.createElement("div");
        errorTitle.style = "font-size: 16px; margin-bottom: 10px; color: #ff6b6b;";
        errorTitle.textContent = "Failed to load friends";

        const errorMessage = document.createElement("div");
        errorMessage.style = "font-size: 14px; margin-bottom: 15px; opacity: 0.8;";
        errorMessage.textContent = "There was an error loading your friend list";

        const retryButton = document.createElement("button");
        retryButton.id = "retry-friends-btn";
        retryButton.style = "padding: 8px 16px; background-color: #4a90e2; color: white; border: none; border-radius: 5px; cursor: pointer; font-size: 14px;";
        retryButton.textContent = "Retry";

        errorDiv.appendChild(errorTitle);
        errorDiv.appendChild(errorMessage);
        errorDiv.appendChild(retryButton);

        content.appendChild(errorDiv);

        // Add retry functionality
        document.getElementById('retry-friends-btn').onclick = () => {
            renderFriendsList(content, sortPreference);
        };
    }
}

async function displayFriends() {
    const sortPreference = localStorage.getItem("friend_sort") || "Alphabetical (A-Z)";

    const photoElement = document.getElementsByClassName("container-inner-item profile-item-top profile-banner home-banner flex flex-direction-row")[0];
    photoElement.style = "padding-bottom: 100px; align-items: center";

    const rowElem = document.querySelector(".container-fullsize.full-width.fixed-height");
    if (!rowElem) return;

    const friendContainer = document.createElement("div");
    friendContainer.className = "col-lg-4 col-md-6 col-xs-12 fixed-height";

    const inner = document.createElement("div");
    inner.className = "container-inner-item boxed agenda-container";
    inner.style = "border-radius: 5px";

    const title = document.createElement("h4");
    title.className = "profile-title";
    title.textContent = "Friends";

    const menu = document.createElement("span");
    menu.className = "pull-right";

    // Dropdown Add Friend
    const dropDown = document.createElement("span");
    dropDown.className = "dropdown event_search_dropdown";

    const dropDownTitle = document.createElement("a");
    dropDownTitle.className = "dropdown-toggle btn simple-link";
    dropDownTitle.setAttribute("data-toggle", "dropdown");
    dropDownTitle.href = "#";
    dropDownTitle.id = "dropdownMenuFriend";
    dropDownTitle.role = "button";
    dropDownTitle.setAttribute("aria-expanded", "false");
    dropDownTitle.textContent = "Add friend ▾";

    const dropDownContent = document.createElement("div");
    dropDownContent.setAttribute("aria-labelledby", "dropdownMenuFriend");
    dropDownContent.className = "dropdown-menu pull-right";
    dropDownContent.style = "top: 21px; padding: .25rem; min-width: 150px; font-size: unset";

    const dropDownContentInner = document.createElement("div");
    dropDownContentInner.className = "event_search_form ul";
    dropDownContentInner.style = "display: flex; flex-direction: column; align-items: center;";

    const dropDownInput = document.createElement("input");
    dropDownInput.setAttribute("autofocus", true);
    dropDownInput.placeholder = "Enter login";
    dropDownInput.style = "margin: 5px; padding: 5px; width: 80%; color: white; outline: none; background-color: #373c48; border: none;";
    dropDownTitle.onclick = () => {setTimeout(() => dropDownInput.focus(), 10)};

    dropDownInput.addEventListener("keydown", async (e) => {
        if (e.key === "Enter") {
            const newFriend = dropDownInput.value.trim().toLowerCase();
            let FRIEND_LIST = getFriendList();

            if (!newFriend) return;

            if (FRIEND_LIST.includes(newFriend)) {
                alert("Friend already in list!");
                return;
            }

            FRIEND_LIST.push(newFriend);
            saveFriendList(FRIEND_LIST);
            dropDownInput.value = '';

            // Re-render without page reload
            await renderFriendsList(content, localStorage.getItem("friend_sort") || "Alphabetical (A-Z)");
        }
    });

    dropDownContentInner.appendChild(dropDownInput);
    dropDownContent.appendChild(dropDownContentInner);
    dropDown.appendChild(dropDownTitle);
    dropDown.appendChild(dropDownContent);
    menu.appendChild(dropDown);

    const sortDropDown = document.createElement("span");
    sortDropDown.className = "dropdown event_search_dropdown";
    sortDropDown.style = "margin-left: 10px;";

    const sortTitle = document.createElement("a");
    sortTitle.className = "dropdown-toggle btn simple-link";
    sortTitle.setAttribute("data-toggle", "dropdown");
    sortTitle.href = "#";
    sortTitle.id = "dropdownMenuSortFriend";
    sortTitle.role = "button";
    sortTitle.setAttribute("aria-expanded", "false");
    sortTitle.textContent = "Sort ▾";

    const sortContent = document.createElement("div");
    sortContent.setAttribute("aria-labelledby", "dropdownMenuSortFriend");
    sortContent.className = "dropdown-menu pull-right";
    sortContent.style = "top: 21px; padding: .25rem; min-width: 150px; font-size: unset";

    const sortOptions = ["Alphabetical (A-Z)", "Alphabetical (Z-A)", "Online First", "Offline First"];
    sortOptions.forEach(opt => {
        const option = document.createElement("div");
        option.textContent = opt;
        option.style = "cursor: pointer; padding: 5px;";
        if (opt === sortPreference) option.style.backgroundColor = "#2c2c2c";

        option.onclick = async () => {
            localStorage.setItem("friend_sort", opt);

            // Update all options styling
            sortOptions.forEach(o => {
                const optEl = Array.from(sortContent.children).find(el => el.textContent === o);
                if (optEl) optEl.style.backgroundColor = o === opt ? "#2c2c2c" : "transparent";
            });

            // Re-render without page reload
            await renderFriendsList(content, opt);
        };

        sortContent.appendChild(option);
    });

    sortDropDown.appendChild(sortTitle);
    sortDropDown.appendChild(sortContent);
    menu.appendChild(sortDropDown);
    title.appendChild(menu);

    const content = document.createElement("div");
    content.className = "overflowable-item";
    content.style = "width: 100%; height: 100%;";

    inner.appendChild(title);
    inner.appendChild(content);
    friendContainer.appendChild(inner);
    rowElem.firstElementChild.insertBefore(friendContainer, rowElem.firstElementChild.firstChild);

    // Initial render
    await renderFriendsList(content, sortPreference);
}


function betterDisplay() {
    setTimeout(() => {
        // Check if already processed to prevent conflicts
        if (document.querySelector('.progressive-blur-container')) {
            console.log('42 Friends: betterDisplay already applied, skipping');
            return;
        }

        const elements = document.getElementsByClassName("improved-intra-banner customized")
        let image = "url(https://profile.intra.42.fr/assets/background_login-a4e0666f73c02f025f590b474b394fd86e1cae20e95261a6e4862c2d0faa1b04.jpg)"
        console.log(elements)
        if (elements.length) {
            image = elements[0].style.backgroundImage
            elements[0].remove()
        }
        const val = document.getElementsByClassName("container-inner-item profile-item-top profile-banner home-banner flex flex-direction-row")
        val[0].style.setProperty("background-image", "unset", "important");
        val[0].style.setProperty("background-color", "transparent", "important");
        document.getElementsByClassName("container-item profile-item full-width")[0].style.setProperty("background-color", "transparent", "important")

        const pageContent = document.getElementsByClassName("page-content page-content-fluid")[0];
        console.log(pageContent)
        // Fix: Properly set background properties to prevent duplication
        pageContent.style.backgroundImage = image;
        pageContent.style.backgroundSize = "cover";
        pageContent.style.backgroundPosition = "center";
        pageContent.style.backgroundRepeat = "no-repeat";
        pageContent.style.backgroundAttachment = "fixed";

        const blurContainer = document.createElement("div");
        blurContainer.className = "progressive-blur-container";
        blurContainer.style.position = "fixed";
        blurContainer.style.left = "0";
        blurContainer.style.bottom = "0";
        blurContainer.style.right = "0";
        blurContainer.style.width = "100%";
        blurContainer.style.height = "70%";
        blurContainer.style.pointerEvents = "none";
        blurContainer.style.zIndex = "-1";

        const blurLayers = [
        { blur: "1px", mask: "linear-gradient(rgba(0,0,0,0), rgba(0,0,0,1) 10%, rgba(0,0,0,1) 30%, rgba(0,0,0,0) 40%)" },
        { blur: "2px", mask: "linear-gradient(rgba(0,0,0,0) 10%, rgba(0,0,0,1) 20%, rgba(0,0,0,1) 40%, rgba(0,0,0,0) 50%)" },
        { blur: "4px", mask: "linear-gradient(rgba(0,0,0,0) 15%, rgba(0,0,0,1) 30%, rgba(0,0,0,1) 50%, rgba(0,0,0,0) 60%)" },
        { blur: "8px", mask: "linear-gradient(rgba(0,0,0,0) 20%, rgba(0,0,0,1) 40%, rgba(0,0,0,1) 60%, rgba(0,0,0,0) 70%)" },
        { blur: "16px", mask: "linear-gradient(rgba(0,0,0,0) 40%, rgba(0,0,0,1) 60%, rgba(0,0,0,1) 80%, rgba(0,0,0,0) 90%)" },
        { blur: "32px", mask: "linear-gradient(rgba(0,0,0,0) 60%, rgba(0,0,0,1) 80%)" },
        ];

        blurLayers.forEach(({ blur, mask }) => {
        const layer = document.createElement("div");
        layer.className = "blur-filter";
        layer.style.position = "absolute";
        layer.style.top = "0";
        layer.style.left = "0";
        layer.style.bottom = "0";
        layer.style.right = "0";
        layer.style.backdropFilter = `blur(${blur})`;
        layer.style.webkitMaskImage = mask;
        layer.style.maskImage = mask;
        layer.style.maskSize = "100% 100%";
        layer.style.webkitMaskSize = "100% 100%";
        blurContainer.appendChild(layer);
        });

        const gradient = document.createElement("div");
        gradient.className = "gradient";
        gradient.style.position = "absolute";
        gradient.style.top = "0";
        gradient.style.left = "0";
        gradient.style.right = "0";
        gradient.style.bottom = "0";
        gradient.style.background = "linear-gradient(transparent, transparent)";
        blurContainer.appendChild(gradient);

        container.appendChild(blurContainer);

        const rowElement = document.getElementsByClassName("col-lg-4 col-md-6 col-xs-12 fixed-height")
        for (const element of rowElement) {
            element.firstElementChild.style = "border-radius: 5px; "
        }

        // S'assurer que les informations utilisateur restent visibles
        const userColumn = document.querySelector('.user-column.flex.flex-direction-column');
        if (userColumn) {
            userColumn.style.display = 'flex';
            userColumn.style.flexDirection = 'column';
            userColumn.style.visibility = 'visible';
        }

        const userPrimary = document.querySelector('.user-column .user-primary');
        if (userPrimary) {
            userPrimary.style.display = 'block';
            userPrimary.style.visibility = 'visible';
        }

        const userInfosContainer = document.querySelector('.col-sm-12.padding-left-30.user-infos');
        if (userInfosContainer) {
            userInfosContainer.style.visibility = 'visible';
            userInfosContainer.style.display = 'block';
        }

        // Modifier la largeur de la box user-header-box infos
        // const infosBox = document.querySelector('.user-header-box.infos');
        // if (infosBox) {
        //     infosBox.style.maxWidth = '65%';
        //     infosBox.style.width = '65%';
        // }

        const userBanner = document.getElementById("attendance_container");//document.getElementsByClassName("container-inner-item profile-item-top profile-banner home-banner flex flex-direction-row");
        userBanner.style.paddingTop = "60px;";

    }, 2000)
}

// Prevent multiple executions
if (!window.__42_FRIENDS_LOADED__) {
    window.__42_FRIENDS_LOADED__ = true;

    displayLogtime();
    displayFriends();
    betterDisplay();
}
