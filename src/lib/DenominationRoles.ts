
// A utility function to provide suggested roles based on denomination.
// This is not exhaustive but provides a good starting point based on real-world examples.

const roleMap: Record<string, string[]> = {
    "Catholic": [
        "Lector", "Extraordinary Minister of Holy Communion", "Altar Server", "Usher", "Greeter", 
        "Cantor", "Choir Member", "Sacristan", "Gift Bearer", "Money Counter",
        "Hospitality (Coffee & Donuts)", "Catechist (Religious Ed)", "Youth Group Leader", "Knight of Columbus", "AV Tech"
    ],
    "Catholic (Ordinariate)": [
        "Lector", "Chalicist", "Acolyte", "Subdeacon", "Thurifer",
        "Usher", "Greeter", "Cantor", "Choir Member", "Sacristan",
        "Oblationer", "Altar Guild", "Coffee Hour Host", "Sunday School Teacher", "AV Tech"
    ],
    "Episcopal/Anglican": [
        "Lector", "Chalice Bearer", "Acolyte", "Usher", "Greeter", "Choir Member",
        "Altar Guild", "Flower Guild", "Coffee Hour Host", "Sunday School Teacher (Godly Play)",
        "Verger", "Intercessor", "Sound Tech", "Livestream Operator", "Welcome Team"
    ],
    "Anglican (ACNA)": [
        "Lector", "Chalicist", "Acolyte", "Crucifer", "Usher", "Greeter",
        "Altar Guild", "Flower Guild", "Coffee Hour Host", "Sunday School Teacher",
        "Intercessor (Prayers of the People)", "Sound/AV Tech", "Worship Team (Music)", "Nursery Volunteer", "Security Team"
    ],
    "Lutheran": [
        "Reader", "Assisting Minister", "Acolyte", "Usher", "Greeter",
        "Communion Assistant", "Altar Guild", "Choir Member", "Cantor", "AV Tech",
        "Offering Counter", "Coffee Hour Host", "Sunday School Teacher", "Youth Leader", "Welcome Center"
    ],
    "Lutheran (LCMS)": [
        "Lector/Reader", "Elder on Duty", "Acolyte", "Usher", "Greeter",
        "Communion Assistant", "Altar Guild", "Choir Member", "Organist", "Sound Tech",
        "Offering Counter", "Coffee Hour Host", "Sunday School Teacher", "Youth Volunteer", "Welcome Desk"
    ],
     "Lutheran (ELCA)": [
        "Reader", "Assisting Minister", "Acolyte", "Usher", "Greeter",
        "Communion Assistant", "Altar Guild", "Choir Member", "Bread Baker", "Sound/AV Tech",
        "Offering Counter", "Hospitality Team", "Sunday School Teacher", "Confirmation Guide", "Welcome Desk"
    ],
    "Methodist": [
        "Liturgist", "Usher", "Greeter", "Acolyte", "Choir Member",
        "Sound Tech", "Media Shout Operator", "Offering Counter", "Welcome Center Host",
        "Coffee Fellowship", "Sunday School Teacher", "UMYF Sponsor", "Children's Church Leader", "Worship Leader", "Prayer Team"
    ],
    "United Methodist": [
        "Liturgist", "Usher", "Greeter", "Acolyte", "Chancel Choir",
        "Sound Board Operator", "ProPresenter Tech", "Offering Counter", "Welcome Desk",
        "Hospitality Team", "Sunday School Teacher", "Youth Counselor", "Children's Message", "Worship Leader", "Prayer Partner"
    ],
    "Presbyterian": [
        "Liturgist (Reader)", "Usher", "Greeter", "Deacon on Duty", "Elder of the Month",
        "Choir Member", "AV Team (Sound/Slides)", "Nursery Volunteer", "Children's Worship Leader",
        "Youth Advisor", "Coffee Hour Host", "Welcome Desk", "Prayer Team", "Offering Counter", "Communion Prep"
    ],
    "Presbyterian (PCA)": [
        "Scripture Reader", "Usher", "Greeter", "Deacon for Welcome", "Nursery Worker",
        "Children's Church Teacher", "Youth Group Leader", "Sound Technician", "Media Presentation", "Music Team",
        "Lord's Supper Prep Team", "Coffee/Snack Team", "Welcome Center", "Book Table", "Security Team"
    ],
    "Presbyterian (PCUSA)": [
        "Liturgist", "Usher", "Greeter", "Deacon Greeter", "Choir",
        "AV Team", "Nursery Caregiver", "Children's Time Leader",
        "Youth Group Advisor", "Fellowship Hour Host", "Welcome Center", "Prayer Chain", "Communion Server", "Offering Counter"
    ],
    "Baptist": [
        "Greeter", "Usher", "Welcome Center Host", "Nursery Worker", "Preschool Teacher",
        "Children's Church Leader", "Youth Small Group Leader", "Audio Tech", "Video/Lighting Tech", "Vocal Team",
        "Worship Band", "Decision Counselor", "Security Team", "Parking Team", "Coffee & Connections Host"
    ],
    "Southern Baptist": [
        "Greeter", "Usher", "Connect Center Host", "Nursery Volunteer", "Preschool Sunday School",
        "Children's Worship Leader", "Student Ministry Leader", "Sound Engineer", "ProPresenter Operator", "Worship Choir",
        "Praise Band", "Prayer Partner", "Safety Team", "Parking Lot Team", "Hospitality Team"
    ],
    "Non-denominational": [
        "Greeter", "Usher", "Host Team", "Kids Check-in", "Nursery Volunteer",
        "Preschool Teacher", "Elementary Small Group Leader", "Youth Leader/Mentor", "Worship Team (Vocal)",
        "Worship Team (Band)", "Production (Sound)", "Production (Slides/ProPresenter)", "Production (Lighting)",
        "Cafe Team", "Prayer Team", "Security Team"
    ],
    "Default": [
        "Greeter", "Usher", "Reader/Lector", "Nursery Volunteer", "Children's Teacher", "Youth Helper",
        "Coffee Maker", "Welcome Desk", "Sound Tech", "Media/Slides Operator", "Worship Team",
        "Prayer Team", "Security", "Parking Attendant", "Altar Guild/Communion Prep"
    ]
};

export function getSuggestedRoles(denomination?: string): string[] {
    if (denomination && roleMap[denomination]) {
        return roleMap[denomination];
    }
    // Check for base denomination (e.g., "Lutheran" if "Lutheran (LCMS)" not found)
    const baseDenomination = denomination?.split(' ')[0];
    if (baseDenomination && roleMap[baseDenomination]) {
        return roleMap[baseDenomination];
    }
    return roleMap.Default;
}
