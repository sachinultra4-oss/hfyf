import {
  AddLeadPayload,
  RawActivityItem,
  RawApiLead,
  UpdateLeadPayload,
} from "../types/lead";

function hoursOffsetIso(hoursOffset: number): string {
  return new Date(Date.now() + hoursOffset * 3600 * 1000).toISOString();
}

function daysOffsetIso(daysOffset: number, hour = 11, minute = 20): string {
  const d = new Date();
  d.setDate(d.getDate() + daysOffset);
  d.setHours(hour, minute, 0, 0);
  return d.toISOString();
}

function todayAtIso(hour: number, minute = 0): string {
  const d = new Date();
  d.setHours(hour, minute, 0, 0);
  return d.toISOString();
}

let mockStore: RawApiLead[] = [
  {
    row: 20,
    Received: hoursOffsetIso(-0.8),
    Phone: "09226217401",
    Name: "Priya Deshmukh",
    Source: "Call",
    "Call Status": "Missed",
    "Duration (sec)": 0,
    "Follow-up": "New",
    Notes: "Rang twice before clinic opened. Wants skin consultation.",
    "Next Follow-up": hoursOffsetIso(-0.3), // Overdue follow-up
    "Assigned To": "",
    "Appointment Date": "",
    "Appointment Status": "",
    Treatment: "",
    Revenue: "",
    "Last Updated": "",
    "Updated By": "",
  },
  {
    row: 19,
    Received: hoursOffsetIso(-1.5),
    Phone: "09820411892",
    Name: "",
    Source: "Instagram",
    "Call Status": "DM",
    "Duration (sec)": 0,
    "Follow-up": "New",
    Notes: "Asked about therapy session charges & weekend slots on reel.",
    "Next Follow-up": "",
    "Assigned To": "",
    "Appointment Date": "",
    "Appointment Status": "",
    Treatment: "",
    Revenue: "",
    "Last Updated": "",
    "Updated By": "",
  },
  {
    row: 18,
    Received: hoursOffsetIso(-3.2),
    Phone: "09811543210",
    Name: "Rahul Kulkarni",
    Source: "Call",
    "Call Status": "Missed - Busy",
    "Duration (sec)": 0,
    "Follow-up": "Called back",
    Notes: "Missed while front desk was with a patient. Asked to call back today evening.",
    "Next Follow-up": hoursOffsetIso(2.5), // Due today
    "Assigned To": "Reception",
    "Appointment Date": "",
    "Appointment Status": "",
    Treatment: "",
    Revenue: "",
    "Last Updated": hoursOffsetIso(-2.4),
    "Updated By": "Reception",
  },
  {
    row: 17,
    Received: hoursOffsetIso(-5.5),
    Phone: "+91 98765 43210",
    Name: "Ananya Sharma",
    Source: "Website",
    "Call Status": "Form",
    "Duration (sec)": 0,
    "Follow-up": "Called back",
    Notes: "Requested evening appointment for follow-up visit.",
    "Next Follow-up": daysOffsetIso(-1, 16, 0), // Overdue from yesterday
    "Assigned To": "Dr. Sultan",
    "Appointment Date": "",
    "Appointment Status": "",
    Treatment: "",
    Revenue: "",
    "Last Updated": hoursOffsetIso(-4.1),
    "Updated By": "Dr. Sultan",
  },
  {
    row: 16,
    Received: hoursOffsetIso(-6.1),
    Phone: "09930122488",
    Name: "Vikram Nair",
    Source: "WhatsApp",
    "Call Status": "Message",
    "Duration (sec)": 0,
    "Follow-up": "Booked",
    Notes: "Confirmed afternoon slot for consultation.",
    "Next Follow-up": "",
    "Assigned To": "Reception",
    "Appointment Date": todayAtIso(16, 30), // Today appointment
    "Appointment Status": "Scheduled",
    Treatment: "Consultation",
    Revenue: "",
    "Last Updated": hoursOffsetIso(-3.0),
    "Updated By": "Reception",
  },
  {
    row: 15,
    Received: daysOffsetIso(-1, 16, 40),
    Phone: "09765098123",
    Name: "Sneha Joshi",
    Source: "Google Listing",
    "Call Status": "Answered",
    "Duration (sec)": 142,
    "Follow-up": "Booked",
    Notes: "Found clinic on Google Maps. Booked therapy session.",
    "Next Follow-up": "",
    "Assigned To": "Dr. Sultan",
    "Appointment Date": daysOffsetIso(1, 11, 0), // Tomorrow
    "Appointment Status": "Scheduled",
    Treatment: "Therapy session",
    Revenue: "",
    "Last Updated": daysOffsetIso(-1, 17, 5),
    "Updated By": "Reception",
  },
  {
    row: 14,
    Received: daysOffsetIso(-1, 13, 15),
    Phone: "09823055671",
    Name: "Ritu Khanna",
    Source: "Call",
    "Call Status": "Missed",
    "Duration (sec)": 0,
    "Follow-up": "Called back",
    Notes: "Called back, asked to follow up in 2 days.",
    "Next Follow-up": daysOffsetIso(2, 10, 30), // Upcoming 7 days
    "Assigned To": "Assistant",
    "Appointment Date": "",
    "Appointment Status": "",
    Treatment: "",
    Revenue: "",
    "Last Updated": daysOffsetIso(-1, 14, 2),
    "Updated By": "Assistant",
  },
  {
    row: 13,
    Received: daysOffsetIso(-2, 10, 50),
    Phone: "09167889012",
    Name: "Meera Iyer",
    Source: "Instagram",
    "Call Status": "DM",
    "Duration (sec)": 0,
    "Follow-up": "Booked",
    Notes: "Completed first consultation, paid at desk.",
    "Next Follow-up": "",
    "Assigned To": "Dr. Sultan",
    "Appointment Date": daysOffsetIso(-1, 15, 0),
    "Appointment Status": "Visited",
    Treatment: "Consultation",
    Revenue: 1500,
    "Last Updated": daysOffsetIso(-1, 16, 15),
    "Updated By": "Reception",
  },
  {
    row: 12,
    Received: daysOffsetIso(-3, 18, 5),
    Phone: "09845123789",
    Name: "Arjun Mehta",
    Source: "Call",
    "Call Status": "Answered",
    "Duration (sec)": 96,
    "Follow-up": "Not interested",
    Notes: "Wanted home visit; clinic only offers in-person consults.",
    "Next Follow-up": "",
    "Assigned To": "Assistant",
    "Appointment Date": "",
    "Appointment Status": "",
    Treatment: "",
    Revenue: "",
    "Last Updated": daysOffsetIso(-3, 18, 12),
    "Updated By": "Assistant",
  },
  {
    row: 11,
    Received: daysOffsetIso(-4, 15, 22),
    Phone: "09892345611",
    Name: "Kavita Rao",
    Source: "Website",
    "Call Status": "Form",
    "Duration (sec)": 0,
    "Follow-up": "Booked",
    Notes: "Therapy package session completed.",
    "Next Follow-up": "",
    "Assigned To": "Dr. Sultan",
    "Appointment Date": daysOffsetIso(-2, 11, 30),
    "Appointment Status": "Visited",
    Treatment: "Therapy session",
    Revenue: 3200,
    "Last Updated": daysOffsetIso(-2, 12, 45),
    "Updated By": "Dr. Sultan",
  },
  {
    row: 10,
    Received: daysOffsetIso(-6, 12, 10),
    Phone: "09819776543",
    Name: "Suresh Patil",
    Source: "Google Listing",
    "Call Status": "Answered",
    "Duration (sec)": 78,
    "Follow-up": "Called back",
    Notes: "Comparing therapy session packages. Call next week.",
    "Next Follow-up": daysOffsetIso(4, 11, 0), // Upcoming 7 days
    "Assigned To": "Reception",
    "Appointment Date": "",
    "Appointment Status": "",
    Treatment: "",
    Revenue: "",
    "Last Updated": daysOffsetIso(-5, 10, 15),
    "Updated By": "Reception",
  },
  {
    row: 9,
    Received: daysOffsetIso(-8, 17, 30),
    Phone: "09321456980",
    Name: "Neha Verma",
    Source: "WhatsApp",
    "Call Status": "Message",
    "Duration (sec)": 0,
    "Follow-up": "Booked",
    Notes: "Sent lab report photo, confirmed follow-up visit.",
    "Next Follow-up": "",
    "Assigned To": "Dr. Sultan",
    "Appointment Date": daysOffsetIso(3, 17, 0), // Upcoming appointment
    "Appointment Status": "Scheduled",
    Treatment: "Follow-up visit",
    Revenue: "",
    "Last Updated": daysOffsetIso(-7, 11, 0),
    "Updated By": "Reception",
  },
  {
    row: 8,
    Received: daysOffsetIso(-11, 11, 45),
    Phone: "09920887612",
    Name: "Rohan Kapoor",
    Source: "Call",
    "Call Status": "Missed",
    "Duration (sec)": 0,
    "Follow-up": "Booked",
    Notes: "Did not turn up for scheduled consultation.",
    "Next Follow-up": "",
    "Assigned To": "Assistant",
    "Appointment Date": daysOffsetIso(-4, 14, 0),
    "Appointment Status": "No-show",
    Treatment: "Consultation",
    Revenue: "",
    "Last Updated": daysOffsetIso(-4, 15, 0),
    "Updated By": "Assistant",
  },
  {
    row: 7,
    Received: daysOffsetIso(-14, 14, 20),
    Phone: "09867011234",
    Name: "Divya Menon",
    Source: "Instagram",
    "Call Status": "DM",
    "Duration (sec)": 0,
    "Follow-up": "Booked",
    Notes: "Visited and paid for follow-up visit.",
    "Next Follow-up": "",
    "Assigned To": "Dr. Sultan",
    "Appointment Date": daysOffsetIso(-10, 16, 0),
    "Appointment Status": "Visited",
    Treatment: "Follow-up visit",
    Revenue: 1200,
    "Last Updated": daysOffsetIso(-10, 17, 10),
    "Updated By": "Dr. Sultan",
  },
  {
    row: 6,
    Received: daysOffsetIso(-18, 10, 5),
    Phone: "09769432198",
    Name: "Amitabh Sinha",
    Source: "Other",
    "Call Status": "Walk-in",
    "Duration (sec)": 0,
    "Follow-up": "Booked",
    Notes: "Referred by neighbor, visited clinic.",
    "Next Follow-up": "",
    "Assigned To": "Reception",
    "Appointment Date": daysOffsetIso(-17, 10, 30),
    "Appointment Status": "Visited",
    Treatment: "Consultation",
    Revenue: 1500,
    "Last Updated": daysOffsetIso(-17, 11, 15),
    "Updated By": "Reception",
  },
  {
    row: 5,
    Received: daysOffsetIso(-35, 16, 12),
    Phone: "09833221100",
    Name: "Pooja Hegde",
    Source: "Website",
    "Call Status": "Form",
    "Duration (sec)": 0,
    "Follow-up": "Booked",
    Notes: "Previous month therapy session.",
    "Next Follow-up": "",
    "Assigned To": "Dr. Sultan",
    "Appointment Date": daysOffsetIso(-32, 15, 0),
    "Appointment Status": "Visited",
    Treatment: "Therapy session",
    Revenue: 2800,
    "Last Updated": daysOffsetIso(-32, 16, 30),
    "Updated By": "Dr. Sultan",
  },
  {
    row: 4,
    Received: daysOffsetIso(-40, 9, 45),
    Phone: "09821554433",
    Name: "Karan Malhotra",
    Source: "Google Listing",
    "Call Status": "Answered",
    "Duration (sec)": 118,
    "Follow-up": "Booked",
    Notes: "Consultation completed last month.",
    "Next Follow-up": "",
    "Assigned To": "Reception",
    "Appointment Date": daysOffsetIso(-38, 11, 0),
    "Appointment Status": "Visited",
    Treatment: "Consultation",
    Revenue: 1500,
    "Last Updated": daysOffsetIso(-38, 12, 0),
    "Updated By": "Reception",
  },
];

let mockActivityStore: RawActivityItem[] = [
  {
    Time: hoursOffsetIso(-2.4),
    Row: 18,
    Actor: "Reception",
    Action: "Updated lead",
    Details: "Changed status New → Called back; Assigned to Reception; Set next follow-up",
  },
  {
    Time: hoursOffsetIso(-3.0),
    Row: 16,
    Actor: "Reception",
    Action: "Booked appointment",
    Details: "Changed status Called back → Booked; Scheduled Consultation",
  },
  {
    Time: hoursOffsetIso(-4.1),
    Row: 17,
    Actor: "Dr. Sultan",
    Action: "Updated lead",
    Details: "Changed status New → Called back; Assigned to Dr. Sultan",
  },
  {
    Time: daysOffsetIso(-1, 16, 15),
    Row: 13,
    Actor: "Reception",
    Action: "Marked Visited",
    Details: "Appointment Status → Visited; Revenue ₹1500",
  },
  {
    Time: daysOffsetIso(-1, 14, 2),
    Row: 14,
    Actor: "Assistant",
    Action: "Called back missed call",
    Details: "Changed status New → Called back; Assigned to Assistant",
  },
  {
    Time: daysOffsetIso(-2, 12, 45),
    Row: 11,
    Actor: "Dr. Sultan",
    Action: "Marked Visited",
    Details: "Appointment Status → Visited; Treatment Therapy session; Revenue ₹3200",
  },
  {
    Time: daysOffsetIso(-3, 18, 12),
    Row: 12,
    Actor: "Assistant",
    Action: "Updated lead",
    Details: "Changed status New → Not interested",
  },
  {
    Time: daysOffsetIso(-4, 15, 0),
    Row: 8,
    Actor: "Assistant",
    Action: "Appointment No-show",
    Details: "Appointment Status Scheduled → No-show",
  },
  {
    Time: daysOffsetIso(-5, 10, 15),
    Row: 10,
    Actor: "Reception",
    Action: "Updated lead",
    Details: "Changed status New → Called back; Set follow-up",
  },
  {
    Time: daysOffsetIso(-7, 11, 0),
    Row: 9,
    Actor: "Reception",
    Action: "Booked appointment",
    Details: "Changed status Called back → Booked; Follow-up visit",
  },
  {
    Time: daysOffsetIso(-10, 17, 10),
    Row: 7,
    Actor: "Dr. Sultan",
    Action: "Marked Visited",
    Details: "Appointment Status → Visited; Revenue ₹1200",
  },
];

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function mockFetchLeads(): Promise<RawApiLead[]> {
  await delay(300);
  return mockStore.map((item) => ({ ...item }));
}

export async function mockUpdateLead(payload: UpdateLeadPayload): Promise<void> {
  await delay(280);
  const idx = mockStore.findIndex((item) => item.row === payload.row);
  if (idx === -1) {
    throw new Error(`Lead row ${payload.row} not found.`);
  }
  const current = mockStore[idx];
  const changes: string[] = [];

  const next: RawApiLead = { ...current };

  if (payload.name !== undefined && payload.name !== current.Name) {
    changes.push(`Name "${current.Name || "Unknown"}" → "${payload.name || "Unknown"}"`);
    next.Name = payload.name;
  }
  if (payload.followup !== undefined && payload.followup !== current["Follow-up"]) {
    changes.push(`Status ${current["Follow-up"] || "New"} → ${payload.followup}`);
    next["Follow-up"] = payload.followup;
  }
  if (payload.assignedTo !== undefined && payload.assignedTo !== (current["Assigned To"] ?? "")) {
    changes.push(`Assigned → ${payload.assignedTo || "Unassigned"}`);
    next["Assigned To"] = payload.assignedTo;
  }
  if (
    payload.nextFollowup !== undefined &&
    payload.nextFollowup !== (current["Next Follow-up"] ?? "")
  ) {
    changes.push(payload.nextFollowup ? "Updated next follow-up" : "Cleared next follow-up");
    next["Next Follow-up"] = payload.nextFollowup;
  }
  if (
    payload.appointmentDate !== undefined &&
    payload.appointmentDate !== (current["Appointment Date"] ?? "")
  ) {
    changes.push(payload.appointmentDate ? "Set appointment date" : "Cleared appointment date");
    next["Appointment Date"] = payload.appointmentDate;
  }
  if (
    payload.appointmentStatus !== undefined &&
    payload.appointmentStatus !== (current["Appointment Status"] ?? "")
  ) {
    changes.push(`Appointment → ${payload.appointmentStatus || "None"}`);
    next["Appointment Status"] = payload.appointmentStatus;
  }
  if (payload.treatment !== undefined && payload.treatment !== (current.Treatment ?? "")) {
    changes.push(`Treatment → ${payload.treatment || "None"}`);
    next.Treatment = payload.treatment;
  }
  if (
    payload.revenue !== undefined &&
    String(payload.revenue) !== String(current.Revenue ?? "")
  ) {
    changes.push(
      payload.revenue !== "" ? `Revenue → ${payload.revenue}` : "Cleared revenue"
    );
    next.Revenue = payload.revenue;
  }
  if (payload.notes !== undefined && payload.notes !== current.Notes) {
    changes.push("Updated notes");
    next.Notes = payload.notes;
  }

  const nowIso = new Date().toISOString();
  next["Last Updated"] = nowIso;
  next["Updated By"] = payload.actor;

  mockStore[idx] = next;

  if (changes.length > 0) {
    mockActivityStore = [
      {
        Time: nowIso,
        Row: payload.row,
        Actor: payload.actor || "Staff",
        Action: "Updated lead",
        Details: changes.join("; "),
      },
      ...mockActivityStore,
    ];
  }
}

export async function mockAddLead(payload: AddLeadPayload): Promise<RawApiLead> {
  await delay(300);
  const nextRow = mockStore.reduce((max, item) => Math.max(max, item.row), 1) + 1;
  const nowIso = new Date().toISOString();
  const created: RawApiLead = {
    row: nextRow,
    Received: nowIso,
    Phone: payload.phone,
    Name: payload.name,
    Source: payload.source,
    "Call Status": payload.status,
    "Duration (sec)": payload.duration,
    "Follow-up": "New",
    Notes: payload.notes,
    "Next Follow-up": "",
    "Assigned To": "",
    "Appointment Date": "",
    "Appointment Status": "",
    Treatment: "",
    Revenue: "",
    "Last Updated": nowIso,
    "Updated By": payload.actor || "",
  };
  mockStore = [created, ...mockStore];

  mockActivityStore = [
    {
      Time: nowIso,
      Row: nextRow,
      Actor: payload.actor || "Staff",
      Action: "Added lead",
      Details: `${payload.source} (${payload.status}) · ${payload.phone}`,
    },
    ...mockActivityStore,
  ];

  return created;
}

export async function mockFetchActivity(row?: number): Promise<RawActivityItem[]> {
  await delay(220);
  if (row !== undefined) {
    return mockActivityStore
      .filter((item) => Number(item.Row) === row)
      .map((item) => ({ ...item }));
  }
  return mockActivityStore.slice(0, 100).map((item) => ({ ...item }));
}
