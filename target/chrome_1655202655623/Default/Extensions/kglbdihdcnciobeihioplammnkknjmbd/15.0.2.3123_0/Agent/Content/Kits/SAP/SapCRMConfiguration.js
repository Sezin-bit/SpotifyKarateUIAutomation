var sapCRMConfig = {
    "NavigationBarComponent":
    {
        "Name": "CRM_NavigationBar",
        "MaxDepth": 13,
        "Flags": 0
    },
    "HeaderComponent":
    {
        "Name": "CRM_Header_Frame",
        "defaultLogicalName": "Header",
        "MaxDepth": 27,
        "Flags": 1
    },
    "BoxComponent":
    {
        "Name": "CRM_BoxContainer",
        "stepDownSpecifier": "CRM_BoxContainer_Name",
        "MaxDepth": 15,
        "Flags": 2
    },
    "iViewComponent":
    {
        "Name": "CRM_iView_Testmode",
        "stepDownSpecifier": "CRM_iView_Testmode_Name",
        "MaxDepth": 25,
        "Flags": 2
    },
    "AreaFrameComponent":
    {
        "Name": "CRM_AreaFrame",
        "stepDownSpecifier": "CRM_AreaFrame_Name",
        "MaxDepth": 60,
        "Flags": 2
    },
    "ResultsComponent":
    {
        "Name": "CRM_Table_Testmode",
        "stepDownSpecifier": "CRM_TextView_Testmode",
        "MaxDepth": 20,
        "Flags": 2
    },
    "StatusBarComponent":
    {
        "Name": "CRM_MessageContainer",
        "stepDownSpecifier": "CRM_MessageContainer_Name",
        "MaxDepth": 5,
        "Flags": 2
    },
    "CalendarComponent":
    {
        "Name": "CRM_Calendar_BiMonth",
        "MaxDepth": 10,
        "Flags": 2
    }
    ,
    "CRMApplicationFrameComponent":
    {
        "Name": "CRM_Application_Frame"
    },
    "AreaWithNoBoxComponent":
    {
        "Name": "CRM_AreaWithNoBoxContainer",
        "stepDownSpecifier": "CRM_BoxContainer_Name",
        "MaxDepth": 50,
        "Flags": 2
    },
}