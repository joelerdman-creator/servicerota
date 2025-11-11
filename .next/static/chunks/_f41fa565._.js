(globalThis.TURBOPACK = globalThis.TURBOPACK || []).push([typeof document === "object" ? document.currentScript : undefined, {

"[project]/src/lib/mock-data-lazy.ts [app-client] (ecmascript)": ((__turbopack_context__) => {
"use strict";

var { g: global, __dirname, k: __turbopack_refresh__, m: module } = __turbopack_context__;
{
__turbopack_context__.s({
    "getMockData": (()=>getMockData)
});
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$date$2d$fns$2f$startOfToday$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/date-fns/startOfToday.mjs [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$date$2d$fns$2f$addDays$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/date-fns/addDays.mjs [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$date$2d$fns$2f$subDays$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/date-fns/subDays.mjs [app-client] (ecmascript)");
;
const MOCK_CHURCH_ID = 'church_123';
const MOCK_VOLUNTEER_ID = 'user_volunteer_1';
const MOCK_ADMIN_ID = 'user_admin_1';
const MOCK_FAMILY_ID = 'family_1';
const today = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$date$2d$fns$2f$startOfToday$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__["startOfToday"])();
const getMockData = ()=>{
    const initialChurch = {
        id: MOCK_CHURCH_ID,
        name: "St. Francis' Church",
        address: "123 Gospel Lane, Anytown, USA 12345",
        phone: "(555) 123-4567",
        adminName: "John Smith",
        adminEmail: "admin@stfrancis.org",
        publishedMonths: [
            `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`
        ]
    };
    const initialFamilies = [
        {
            id: MOCK_FAMILY_ID,
            members: [
                {
                    id: 'user_volunteer_1',
                    name: 'Alice Johnson',
                    isPrimary: true
                },
                {
                    id: 'user_volunteer_5',
                    name: 'Steve Johnson',
                    isPrimary: false
                }
            ],
            memberIds: [
                'user_volunteer_1',
                'user_volunteer_5'
            ]
        }
    ];
    const initialVolunteers = [
        {
            id: MOCK_ADMIN_ID,
            name: 'Admin User',
            email: 'admin@example.com',
            phone: '555-0100',
            preferences: {
                preferredRoleIds: [],
                servingFrequency: 'as-needed',
                familyServingPreference: 'any',
                familyManagementEnabled: false
            },
            churchId: MOCK_CHURCH_ID,
            role: 'admin'
        },
        {
            id: MOCK_VOLUNTEER_ID,
            name: 'Alice Johnson',
            email: 'alice@example.com',
            phone: '555-0101',
            familyId: MOCK_FAMILY_ID,
            preferences: {
                preferredRoleIds: [
                    'urole_1',
                    'urole_5'
                ],
                servingFrequency: 'bi-weekly',
                familyServingPreference: 'possible',
                familyManagementEnabled: true
            },
            churchId: MOCK_CHURCH_ID,
            role: 'volunteer'
        },
        {
            id: 'user_volunteer_2',
            name: 'Bob Williams',
            email: 'bob@example.com',
            phone: '555-0102',
            preferences: {
                preferredRoleIds: [
                    'urole_2',
                    'urole_3'
                ],
                servingFrequency: 'monthly',
                familyServingPreference: 'any',
                familyManagementEnabled: false
            },
            churchId: MOCK_CHURCH_ID,
            role: 'volunteer'
        },
        {
            id: 'user_volunteer_3',
            name: 'Charlie Brown',
            email: 'charlie@example.com',
            phone: '555-0103',
            preferences: {
                preferredRoleIds: [
                    'urole_4'
                ],
                servingFrequency: 'weekly',
                familyServingPreference: 'any',
                familyManagementEnabled: false
            },
            churchId: MOCK_CHURCH_ID,
            role: 'volunteer'
        },
        {
            id: 'user_volunteer_4',
            name: 'Diana Prince',
            email: 'diana@example.com',
            phone: '555-0104',
            preferences: {
                preferredRoleIds: [
                    'urole_1',
                    'urole_2',
                    'urole_3'
                ],
                servingFrequency: 'as-needed',
                familyServingPreference: 'any',
                familyManagementEnabled: false
            },
            churchId: MOCK_CHURCH_ID,
            role: 'volunteer'
        },
        {
            id: 'user_volunteer_5',
            name: 'Steve Johnson',
            email: 'steve@example.com',
            phone: '555-0105',
            familyId: MOCK_FAMILY_ID,
            preferences: {
                preferredRoleIds: [
                    'urole_4'
                ],
                servingFrequency: 'monthly',
                familyServingPreference: 'possible',
                familyManagementEnabled: true
            },
            churchId: MOCK_CHURCH_ID,
            role: 'volunteer'
        }
    ];
    const initialUniversalRoles = [
        {
            id: 'urole_1',
            name: 'Lector',
            description: "Reads the lessons for the day.",
            churchId: MOCK_CHURCH_ID
        },
        {
            id: 'urole_2',
            name: 'Usher',
            description: "Welcomes attendees and assists with seating.",
            churchId: MOCK_CHURCH_ID
        },
        {
            id: 'urole_3',
            name: 'Acolyte',
            description: "Assists the clergy during the service.",
            churchId: MOCK_CHURCH_ID
        },
        {
            id: 'urole_4',
            name: 'Coffee Hour Host',
            description: "Prepares and serves refreshments after the service.",
            churchId: MOCK_CHURCH_ID
        },
        {
            id: 'urole_5',
            name: 'Altar Guild',
            description: "Prepares the altar and sacred vessels for worship.",
            churchId: MOCK_CHURCH_ID
        }
    ];
    const initialServiceTemplates = [
        {
            id: 'template_1',
            name: 'Sunday Morning Eucharist',
            roles: [
                {
                    instanceId: 'tr_1',
                    roleId: 'urole_1',
                    name: 'Lector'
                },
                {
                    instanceId: 'tr_2',
                    roleId: 'urole_2',
                    name: 'Usher'
                },
                {
                    instanceId: 'tr_3',
                    roleId: 'urole_2',
                    name: 'Usher'
                },
                {
                    instanceId: 'tr_4',
                    roleId: 'urole_3',
                    name: 'Acolyte'
                }
            ],
            churchId: MOCK_CHURCH_ID
        },
        {
            id: 'template_2',
            name: 'Wednesday Healing Service',
            roles: [
                {
                    instanceId: 'tr_5',
                    roleId: 'urole_1',
                    name: 'Lector'
                },
                {
                    instanceId: 'tr_6',
                    roleId: 'urole_2',
                    name: 'Usher'
                }
            ],
            churchId: MOCK_CHURCH_ID
        }
    ];
    const initialEvents = [
        {
            id: 'event_1',
            churchId: MOCK_CHURCH_ID,
            eventName: 'Sunday Morning Eucharist',
            eventDate: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$date$2d$fns$2f$addDays$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__["addDays"])(today, 3),
            notes: 'This is the main Sunday service.',
            roles: [
                {
                    id: 'role_1',
                    roleName: 'Lector',
                    assignedVolunteerId: 'user_volunteer_1',
                    assignedVolunteerName: 'Alice Johnson',
                    status: 'Pending'
                },
                {
                    id: 'role_2',
                    roleName: 'Usher',
                    assignedVolunteerId: 'user_volunteer_2',
                    assignedVolunteerName: 'Bob Williams',
                    status: 'Confirmed'
                }
            ]
        },
        {
            id: 'event_2',
            churchId: MOCK_CHURCH_ID,
            eventName: 'Wednesday Healing Service',
            eventDate: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$date$2d$fns$2f$addDays$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__["addDays"])(today, 6),
            notes: '',
            roles: [
                {
                    id: 'role_3',
                    roleName: 'Lector',
                    assignedVolunteerId: 'user_volunteer_1',
                    assignedVolunteerName: 'Alice Johnson',
                    status: 'Pending'
                },
                {
                    id: 'role_4',
                    roleName: 'Usher',
                    assignedVolunteerId: null,
                    assignedVolunteerName: null,
                    status: 'Pending'
                }
            ]
        },
        {
            id: 'event_3',
            churchId: MOCK_CHURCH_ID,
            eventName: 'Sunday Morning Eucharist',
            eventDate: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$date$2d$fns$2f$addDays$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__["addDays"])(today, 10),
            notes: '',
            roles: [
                {
                    id: 'role_5',
                    roleName: 'Lector',
                    assignedVolunteerId: 'user_volunteer_3',
                    assignedVolunteerName: 'Charlie Brown',
                    status: 'Confirmed'
                },
                {
                    id: 'role_6',
                    roleName: 'Usher',
                    assignedVolunteerId: 'user_volunteer_1',
                    assignedVolunteerName: 'Alice Johnson',
                    status: 'Declined'
                }
            ]
        },
        {
            id: 'event_4',
            churchId: MOCK_CHURCH_ID,
            eventName: 'Past Service',
            eventDate: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$date$2d$fns$2f$subDays$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__["subDays"])(today, 4),
            notes: '',
            roles: [
                {
                    id: 'role_7',
                    roleName: 'Acolyte',
                    assignedVolunteerId: 'user_volunteer_1',
                    assignedVolunteerName: 'Alice Johnson',
                    status: 'Confirmed'
                }
            ]
        }
    ];
    const initialVolunteerAvailability = [
        {
            volunteerId: 'user_volunteer_1',
            unavailableDates: [
                (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$date$2d$fns$2f$addDays$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__["addDays"])(today, 5),
                (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$date$2d$fns$2f$addDays$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__["addDays"])(today, 12)
            ]
        },
        {
            volunteerId: 'user_volunteer_2',
            unavailableDates: []
        },
        {
            volunteerId: 'user_volunteer_5',
            unavailableDates: [
                (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$date$2d$fns$2f$addDays$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__["addDays"])(today, 5),
                (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$date$2d$fns$2f$addDays$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__["addDays"])(today, 12)
            ]
        }
    ];
    return {
        church: initialChurch,
        families: initialFamilies,
        volunteers: initialVolunteers,
        universalRoles: initialUniversalRoles,
        serviceTemplates: initialServiceTemplates,
        events: initialEvents,
        volunteerAvailability: initialVolunteerAvailability
    };
};
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(module, globalThis.$RefreshHelpers$);
}
}}),
"[project]/node_modules/date-fns/toDate.mjs [app-client] (ecmascript)": ((__turbopack_context__) => {
"use strict";

var { g: global, __dirname } = __turbopack_context__;
{
/**
 * @name toDate
 * @category Common Helpers
 * @summary Convert the given argument to an instance of Date.
 *
 * @description
 * Convert the given argument to an instance of Date.
 *
 * If the argument is an instance of Date, the function returns its clone.
 *
 * If the argument is a number, it is treated as a timestamp.
 *
 * If the argument is none of the above, the function returns Invalid Date.
 *
 * **Note**: *all* Date arguments passed to any *date-fns* function is processed by `toDate`.
 *
 * @typeParam DateType - The `Date` type, the function operates on. Gets inferred from passed arguments. Allows to use extensions like [`UTCDate`](https://github.com/date-fns/utc).
 *
 * @param argument - The value to convert
 *
 * @returns The parsed date in the local time zone
 *
 * @example
 * // Clone the date:
 * const result = toDate(new Date(2014, 1, 11, 11, 30, 30))
 * //=> Tue Feb 11 2014 11:30:30
 *
 * @example
 * // Convert the timestamp to date:
 * const result = toDate(1392098430000)
 * //=> Tue Feb 11 2014 11:30:30
 */ __turbopack_context__.s({
    "default": (()=>__TURBOPACK__default__export__),
    "toDate": (()=>toDate)
});
function toDate(argument) {
    const argStr = Object.prototype.toString.call(argument);
    // Clone the date
    if (argument instanceof Date || typeof argument === "object" && argStr === "[object Date]") {
        // Prevent the date to lose the milliseconds when passed to new Date() in IE10
        return new argument.constructor(+argument);
    } else if (typeof argument === "number" || argStr === "[object Number]" || typeof argument === "string" || argStr === "[object String]") {
        // TODO: Can we get rid of as?
        return new Date(argument);
    } else {
        // TODO: Can we get rid of as?
        return new Date(NaN);
    }
}
const __TURBOPACK__default__export__ = toDate;
}}),
"[project]/node_modules/date-fns/startOfDay.mjs [app-client] (ecmascript)": ((__turbopack_context__) => {
"use strict";

var { g: global, __dirname } = __turbopack_context__;
{
__turbopack_context__.s({
    "default": (()=>__TURBOPACK__default__export__),
    "startOfDay": (()=>startOfDay)
});
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$date$2d$fns$2f$toDate$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/date-fns/toDate.mjs [app-client] (ecmascript)");
;
function startOfDay(date) {
    const _date = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$date$2d$fns$2f$toDate$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__["toDate"])(date);
    _date.setHours(0, 0, 0, 0);
    return _date;
}
const __TURBOPACK__default__export__ = startOfDay;
}}),
"[project]/node_modules/date-fns/startOfToday.mjs [app-client] (ecmascript)": ((__turbopack_context__) => {
"use strict";

var { g: global, __dirname } = __turbopack_context__;
{
__turbopack_context__.s({
    "default": (()=>__TURBOPACK__default__export__),
    "startOfToday": (()=>startOfToday)
});
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$date$2d$fns$2f$startOfDay$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/date-fns/startOfDay.mjs [app-client] (ecmascript)");
;
function startOfToday() {
    return (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$date$2d$fns$2f$startOfDay$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__["startOfDay"])(Date.now());
}
const __TURBOPACK__default__export__ = startOfToday;
}}),
"[project]/node_modules/date-fns/constructFrom.mjs [app-client] (ecmascript)": ((__turbopack_context__) => {
"use strict";

var { g: global, __dirname } = __turbopack_context__;
{
/**
 * @name constructFrom
 * @category Generic Helpers
 * @summary Constructs a date using the reference date and the value
 *
 * @description
 * The function constructs a new date using the constructor from the reference
 * date and the given value. It helps to build generic functions that accept
 * date extensions.
 *
 * It defaults to `Date` if the passed reference date is a number or a string.
 *
 * @typeParam DateType - The `Date` type, the function operates on. Gets inferred from passed arguments. Allows to use extensions like [`UTCDate`](https://github.com/date-fns/utc).
 *
 * @param date - The reference date to take constructor from
 * @param value - The value to create the date
 *
 * @returns Date initialized using the given date and value
 *
 * @example
 * import { constructFrom } from 'date-fns'
 *
 * // A function that clones a date preserving the original type
 * function cloneDate<DateType extends Date(date: DateType): DateType {
 *   return constructFrom(
 *     date, // Use contrustor from the given date
 *     date.getTime() // Use the date value to create a new date
 *   )
 * }
 */ __turbopack_context__.s({
    "constructFrom": (()=>constructFrom),
    "default": (()=>__TURBOPACK__default__export__)
});
function constructFrom(date, value) {
    if (date instanceof Date) {
        return new date.constructor(value);
    } else {
        return new Date(value);
    }
}
const __TURBOPACK__default__export__ = constructFrom;
}}),
"[project]/node_modules/date-fns/addDays.mjs [app-client] (ecmascript)": ((__turbopack_context__) => {
"use strict";

var { g: global, __dirname } = __turbopack_context__;
{
__turbopack_context__.s({
    "addDays": (()=>addDays),
    "default": (()=>__TURBOPACK__default__export__)
});
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$date$2d$fns$2f$toDate$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/date-fns/toDate.mjs [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$date$2d$fns$2f$constructFrom$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/date-fns/constructFrom.mjs [app-client] (ecmascript)");
;
;
function addDays(date, amount) {
    const _date = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$date$2d$fns$2f$toDate$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__["toDate"])(date);
    if (isNaN(amount)) return (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$date$2d$fns$2f$constructFrom$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__["constructFrom"])(date, NaN);
    if (!amount) {
        // If 0 days, no-op to avoid changing times in the hour before end of DST
        return _date;
    }
    _date.setDate(_date.getDate() + amount);
    return _date;
}
const __TURBOPACK__default__export__ = addDays;
}}),
"[project]/node_modules/date-fns/subDays.mjs [app-client] (ecmascript)": ((__turbopack_context__) => {
"use strict";

var { g: global, __dirname } = __turbopack_context__;
{
__turbopack_context__.s({
    "default": (()=>__TURBOPACK__default__export__),
    "subDays": (()=>subDays)
});
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$date$2d$fns$2f$addDays$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/date-fns/addDays.mjs [app-client] (ecmascript)");
;
function subDays(date, amount) {
    return (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$date$2d$fns$2f$addDays$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__["addDays"])(date, -amount);
}
const __TURBOPACK__default__export__ = subDays;
}}),
}]);

//# sourceMappingURL=_f41fa565._.js.map