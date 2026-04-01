
import { NextRequest, NextResponse } from "next/server";
import { firestore as adminFirestore } from "@/firebase/admin-app";
import { RRule, rrulestr } from "rrule";
import { add, isBefore } from "date-fns";

export async function POST(request: NextRequest) {
    const authHeader = request.headers.get('authorization');
    if (!process.env.CRON_SECRET_KEY || authHeader !== `Bearer ${process.env.CRON_SECRET_KEY}`) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!adminFirestore) {
        return NextResponse.json({ error: 'Server Firestore not configured' }, { status: 500 });
    }

    const topUpUntil = add(new Date(), { years: 1 });
    let seriesExtendedCount = 0;
    let eventsCreatedCount = 0;

    try {
        const churchesSnap = await adminFirestore.collection('churches').get();

        for (const churchDoc of churchesSnap.docs) {
            const churchId = churchDoc.id;
            const seriesMetadataRef = adminFirestore.collection(`churches/${churchId}/series_metadata`);
            
            // Query all series metadata — we'll filter for ongoing (no endDate) in code
            // Firestore doesn't natively support "field is null OR field doesn't exist" in a single query
            const allSeriesSnap = await seriesMetadataRef.get();

            if (allSeriesSnap.empty) {
                continue;
            }

            for (const seriesDoc of allSeriesSnap.docs) {
                const seriesId = seriesDoc.id;
                const metadata = seriesDoc.data();

                // Only auto-maintain series without an end date (ongoing/indefinite)
                if (metadata.endDate) {
                    continue;
                }

                const eventsCollectionRef = adminFirestore.collection(`churches/${churchId}/events`);

                const lastEventQuery = eventsCollectionRef
                    .where('seriesId', '==', seriesId)
                    .orderBy('eventDate', 'desc')
                    .limit(1);
                
                const lastEventSnap = await lastEventQuery.get();

                if (lastEventSnap.empty) continue;
                
                const lastEventDoc = lastEventSnap.docs[0];
                const lastEvent = lastEventDoc.data();
                const lastEventDate = new Date(lastEvent.eventDate);

                if (isBefore(lastEventDate, topUpUntil)) {
                    seriesExtendedCount++;
                    const batch = adminFirestore.batch();
                    
                    const rolesSnap = await lastEventDoc.ref.collection('roles').get();
                    const rolesToCopy = rolesSnap.docs.map((d: any) => d.data());

                    let rule;
                    if (metadata.rruleString) {
                        try {
                            rule = rrulestr(metadata.rruleString);
                        } catch (e) {
                            rule = new RRule({ freq: RRule.WEEKLY, dtstart: lastEventDate });
                        }
                    } else {
                        rule = new RRule({ freq: RRule.WEEKLY, dtstart: lastEventDate });
                    }

                    // Generate new occurrences starting from the day after the last event
                    const newDates = rule.between(add(lastEventDate, { days: 1 }), topUpUntil);

                    if (newDates.length > 0) {
                       eventsCreatedCount += newDates.length;
                       newDates.forEach(date => {
                            const newEventRef = eventsCollectionRef.doc();
                            
                            const newEventData = {
                                ...lastEvent,
                                eventDate: date.toISOString(),
                                isPublished: false,
                            };
                            batch.set(newEventRef, newEventData);

                            rolesToCopy.forEach((role: any) => {
                                const newRoleRef = newEventRef.collection('roles').doc();
                                batch.set(newRoleRef, {
                                    eventId: newEventRef.id,
                                    roleName: role.roleName,
                                    status: "Pending"
                                });
                            });
                       });

                       await batch.commit();
                    }
                }
            }
        }
        
        return NextResponse.json({ success: true, message: `Job complete. Extended ${seriesExtendedCount} series and created ${eventsCreatedCount} new events.` });

    } catch (error: any) {
        console.error("Cron job failed:", error);
        return NextResponse.json({ error: error.message || "An unknown error occurred" }, { status: 500 });
    }
}
