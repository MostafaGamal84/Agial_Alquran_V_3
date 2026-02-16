// type
import { Navigation } from 'src/app/@theme/types/navigation';
import { UserTypesEnum } from 'src/app/@theme/types/UserTypesEnum';

export const menus: Navigation[] = [
  {
    // id: 'navigation',
    // title: 'Navigation',
    // type: 'group',
    // icon: 'icon-navigation',
    // role: [
    //   UserTypesEnum.Admin.toString(),
    //   UserTypesEnum.Manager.toString(),
    //   UserTypesEnum.BranchLeader.toString(),
    //   UserTypesEnum.Student.toString(),
    //   UserTypesEnum.Teacher.toString()
    // ],
    // children: [
      // {
      //   id: 'Dashboard',
      //   title: 'Dashboard',
      //   type: 'collapse',
      //   icon: '#custom-status-up',
      //   role: [UserTypesEnum.Admin.toString()],
      //   children: [
      //     {
      //       id: 'default',
      //       title: 'Default',
      //       type: 'item',
      //       url: '/dashboard/default',
      //       breadcrumbs: false
      //     },
      //     {
      //       id: 'analytics',
      //       title: 'Analytics',
      //       type: 'item',
      //       url: '/dashboard/analytics',
      //       role: [UserTypesEnum.Admin.toString()]
      //     },
      //     {
      //       id: 'finance',
      //       title: 'Finance',
      //       type: 'item',
      //       url: '/dashboard/finance',
      //       role: [UserTypesEnum.Admin.toString()]
      //     }
      //   ]
      // },
      // {
      //   id: 'component',
      //   title: 'Components',
      //   type: 'item',
      //   classes: 'nav-item',
      //   url: '/components/input/button',
      //   icon: '#custom-box-1',
      //   target: true,
      //   breadcrumbs: false,
      //   role: [
      //     UserTypesEnum.Admin.toString(),
      //     UserTypesEnum.Manager.toString(),
      //     UserTypesEnum.BranchLeader.toString(),
      //     UserTypesEnum.Student.toString(),
      //     UserTypesEnum.Teacher.toString()
      //   ]
      // }
    // ]
  // },
  // {
  //   id: 'widget',
  //   title: 'Widget',
  //   type: 'group',
  //   icon: 'icon-navigation',
  //   role: [
  //     UserTypesEnum.Admin.toString(),
  //     UserTypesEnum.Manager.toString(),
  //     UserTypesEnum.BranchLeader.toString(),
  //     UserTypesEnum.Student.toString(),
  //     UserTypesEnum.Teacher.toString()
  //   ],
  //   children: [
      // {
      //   id: 'statistics',
      //   title: 'Statistics',
      //   type: 'item',
      //   classes: 'nav-item',
      //   url: '/widget/statistics',
      //   icon: '#custom-story'
      // },
      // {
      //   id: 'data',
      //   title: 'Data',
      //   type: 'item',
      //   classes: 'nav-item',
      //   url: '/widget/data',
      //   icon: '#custom-fatrows'
      // },
  //     {
  //       id: 'chart',
  //       title: 'Chart',
  //       type: 'item',
  //       classes: 'nav-item',
  //       url: '/widget/chart',
  //       icon: '#custom-presentation-chart'
  //     }
  //   ]
  // },
  // {
    id: 'admin',
    title: 'Admin Panel',
    type: 'group',
    icon: 'icon-navigation',
    role: [
      UserTypesEnum.Admin.toString(),
      UserTypesEnum.Manager.toString(),
      UserTypesEnum.BranchLeader.toString(),
      UserTypesEnum.Student.toString(),
      UserTypesEnum.Teacher.toString()
    ],
    children: [
      {
        id: 'Online-Courses',
        title: 'Online Courses',
        type: 'collapse',
        icon: '#custom-layer',
        role: [
          UserTypesEnum.Admin.toString(),
          UserTypesEnum.Manager.toString(),
          UserTypesEnum.BranchLeader.toString(),
          UserTypesEnum.Student.toString(),
          UserTypesEnum.Teacher.toString()
        ],
        children: [
          {
            id: 'dashboard',
            title: 'Dashboard',
            type: 'item',
            url: '/online-course/dashboard',
            role: [
              UserTypesEnum.Admin.toString(),
              // UserTypesEnum.Manager.toString(),
              // UserTypesEnum.BranchLeader.toString(),
              // UserTypesEnum.Student.toString(),
              // UserTypesEnum.Teacher.toString()
            ]
          },
          {
            id: 'branch-manager',
            title: 'Branch Manager',
            type: 'item',
              url: '/online-course/branch-manager/list',
            role: [
              UserTypesEnum.Admin.toString(),
              // UserTypesEnum.Manager.toString(),
              // UserTypesEnum.BranchLeader.toString(),
              // UserTypesEnum.Student.toString(),
              // UserTypesEnum.Teacher.toString()
            ],
            // children: [
              // {
              //   id: 'list',
              //   title: 'List',
              //   type: 'item',
              //   url: '/online-course/branch-manager/list'
              // },
              // {
              //   id: 'add',
              //   title: 'Add',
              //   type: 'item',
              //   url: '/online-course/branch-manager/add',
              //   role: [
              //     UserTypesEnum.Admin.toString(),
              //   ]
              // }
            // ]
          },
           {
            id: 'manager',
            title: 'Manager',
             type: 'item',
                url: '/online-course/manager/list',
            role: [
              UserTypesEnum.Admin.toString(),
              // UserTypesEnum.Manager.toString(),
              UserTypesEnum.BranchLeader.toString(),
              // UserTypesEnum.Student.toString(),
              // UserTypesEnum.Teacher.toString()
            ],
            // children: [
              // {
              //   id: 'list',
              //   title: 'List',
              //   type: 'item',
              //   url: '/online-course/manager/list'
              // },
              // {
              //   id: 'apply',
              //   title: 'Apply',
              //   type: 'item',
              //   url: '/online-course/manager/apply'
              // },
              // {
              //   id: 'add',
              //   title: 'Add',
              //   type: 'item',
              //   url: '/online-course/manager/add',
              //   role: [
              //     UserTypesEnum.Admin.toString(),
              //     UserTypesEnum.BranchLeader.toString(),
              //   ]
              // }
            // ]
          },
          {
            id: 'teacher',
            title: 'Teacher',
            type: 'item',
                url: '/online-course/teacher/list',
            role: [
              UserTypesEnum.Admin.toString(),
              UserTypesEnum.Manager.toString(),
              UserTypesEnum.BranchLeader.toString(),
              // UserTypesEnum.Student.toString(),
              // UserTypesEnum.Teacher.toString()
            ],
            // children: [
            //   {
            //     id: 'list',
            //     title: 'List',
            //     type: 'item',
            //     url: '/online-course/teacher/list'
            //   },
              // {
              //   id: 'apply',
              //   title: 'Apply',
              //   type: 'item',
              //   url: '/online-course/teacher/apply'
              // },
              // {
              //   id: 'add',
              //   title: 'Add',
              //   type: 'item',
              //   url: '/online-course/teacher/add',
              //   role: [
              //     UserTypesEnum.Admin.toString(),
              //     UserTypesEnum.Manager.toString(),
              //     UserTypesEnum.BranchLeader.toString(),
              //   ]
              // }
            // ]
          },
          {
            id: 'student',
            title: 'Student',
             type: 'item',
                url: '/online-course/student/list',
            role: [
              UserTypesEnum.Admin.toString(),
              UserTypesEnum.Manager.toString(),
              UserTypesEnum.BranchLeader.toString(),
              // UserTypesEnum.Student.toString(),
              // UserTypesEnum.Teacher.toString()
            ],
            // children: [
            //   {
            //     id: 'list',
            //     title: 'List',
            //     type: 'item',
            //     url: '/online-course/student/list'
            //   },
              // {
              //   id: 'apply',
              //   title: 'Apply',
              //   type: 'item',
              //   url: '/online-course/student/apply'
              // },
              // {
              //   id: 'add',
              //   title: 'Add',
              //   type: 'item',
              //   url: '/online-course/student/add',
              //   role: [
              //     UserTypesEnum.Admin.toString(),
              //     UserTypesEnum.Manager.toString(),
              //     UserTypesEnum.BranchLeader.toString(),
              //     UserTypesEnum.Student.toString(),
              //     UserTypesEnum.Teacher.toString()
              //   ]
              // }
            // ]
          },
          {
            id: 'courses',
            title: 'Courses',
           type: 'item',
                url: '/online-course/courses/view',
            role: [
              UserTypesEnum.Admin.toString(),
              UserTypesEnum.Manager.toString(),
              UserTypesEnum.BranchLeader.toString(),
              UserTypesEnum.Student.toString(),
              UserTypesEnum.Teacher.toString()
            ],
            // children: [
            //   {
            //     id: 'view',
            //     title: 'View',
            //     type: 'item',
            //     url: '/online-course/courses/view'
            //   },
              // {
              //   id: 'add',
              //   title: 'Add',
              //   type: 'item',
              //   url: '/online-course/courses/add',
              //   role: [
              //     UserTypesEnum.Admin.toString(),
              //     // UserTypesEnum.Manager.toString(),
              //     UserTypesEnum.BranchLeader.toString(),
              //     // UserTypesEnum.Student.toString(),
              //     // UserTypesEnum.Teacher.toString()
              //   ]
              // }
            // ]
          },
          {
            id: 'reports',
            title: 'Reports',
            type: 'collapse',
            role: [
              UserTypesEnum.Admin.toString(),
              UserTypesEnum.Manager.toString(),
              UserTypesEnum.BranchLeader.toString(),
              UserTypesEnum.Student.toString(),
              UserTypesEnum.Teacher.toString()
            ],
            children: [
              {
                id: 'reports-view',
                title: 'Reports',
                type: 'item',
                url: '/online-course/report/view',
                role: [
                  UserTypesEnum.Admin.toString(),
                  UserTypesEnum.Manager.toString(),
                  UserTypesEnum.BranchLeader.toString(),
                  UserTypesEnum.Student.toString(),
                  UserTypesEnum.Teacher.toString()
                ]
              },
              {
                id: 'report-add',
                title: 'Add Report',
                type: 'item',
                url: '/online-course/student/report/add',
                role: [
                  UserTypesEnum.Admin.toString(),
                  UserTypesEnum.Manager.toString(),
                  UserTypesEnum.BranchLeader.toString(),
                  UserTypesEnum.Teacher.toString()
                ]
              }
            ]
          },

          {
            id: 'deleted-objects',
            title: 'العناصر المحذوفة',
            type: 'item',
            url: '/online-course/deleted-objects',
            role: [UserTypesEnum.Admin.toString(), UserTypesEnum.BranchLeader.toString()]
          },
          {
            id: 'subscribes',
            title: 'Subscribes',
            type: 'collapse',
            role: [
              UserTypesEnum.Admin.toString(),
              UserTypesEnum.Manager.toString(),
              UserTypesEnum.BranchLeader.toString(),
              // UserTypesEnum.Student.toString(),
              // UserTypesEnum.Teacher.toString()
            ],
            children: [
              {
                id: 'subscribe',
                title: 'Subscribe',
                type: 'item',
                url: '/online-course/setting/subscribe',
                 role: [
              UserTypesEnum.Admin.toString(),
              UserTypesEnum.Manager.toString(),
              UserTypesEnum.BranchLeader.toString(),
              // UserTypesEnum.Student.toString(),
              // UserTypesEnum.Teacher.toString()
            ],
              },
              {
                id: 'subscribe-type',
                title: 'Subscribe Type',
                type: 'item',
                url: '/online-course/setting/subscribe-type',
                 role: [
              UserTypesEnum.Admin.toString(),
              UserTypesEnum.Manager.toString(),
              UserTypesEnum.BranchLeader.toString(),
              // UserTypesEnum.Student.toString(),
              // UserTypesEnum.Teacher.toString()
            ],
              }
            ]
          },
          
          // {
          //   id: 'pricing',
          //   title: 'Pricing',
          //   type: 'item',
          //   url: '/online-course/pricing'
          // },
          // {
          //   id: 'site',
          //   title: 'Site',
          //   type: 'item',
          //   url: '/online-course/site'
          // },
          // {
          //   id: 'setting',
          //   title: 'Setting',
          //   type: 'collapse',
          //   role: [
          //     UserTypesEnum.Admin.toString(),
          //     UserTypesEnum.Manager.toString(),
          //     UserTypesEnum.BranchLeader.toString(),
          //     UserTypesEnum.Student.toString(),
          //     UserTypesEnum.Teacher.toString()
          //   ],
          //   children: [
          //     {
          //       id: 'payment',
          //       title: 'Payment',
          //       type: 'item',
          //       url: '/online-course/setting/payment'
          //     },
          //     {
          //       id: 'pricing',
          //       title: 'Pricing',
          //       type: 'item',
          //       url: '/online-course/setting/price'
          //     },
          //     {
          //       id: 'notification',
          //       title: 'Notification',
          //       type: 'item',
          //       url: '/online-course/setting/notification'
          //     },
          //     {
          //       id: 'subscribe',
          //       title: 'Subscribe',
          //       type: 'item',
          //       url: '/online-course/setting/subscribe'
          //     },
          //     {
          //       id: 'subscribe-type',
          //       title: 'Subscribe Type',
          //       type: 'item',
          //       url: '/online-course/setting/subscribe-type'
          //     }
          //   ]
          // }
        ]
      },
      {
        id: 'membership',
        title: 'Membership',
         type: 'item',
            url: '/membership/list',
        icon: '#custom-user',
        role: [
          UserTypesEnum.Admin.toString(),
          UserTypesEnum.Manager.toString(),
          UserTypesEnum.BranchLeader.toString(),
          // UserTypesEnum.Student.toString(),
          // UserTypesEnum.Teacher.toString()
        ],
        // children: [
          // {
          //   id: 'dashboard',
          //   title: 'Dashboard',
          //   type: 'item',
          //   url: '/membership/dashboard',
          //   role: [
          //     UserTypesEnum.Admin.toString(),
          //     UserTypesEnum.Manager.toString(),
          //     UserTypesEnum.BranchLeader.toString(),
          //     UserTypesEnum.Student.toString(),
          //     UserTypesEnum.Teacher.toString()
          //   ]
          // },
          // {
          //   id: 'list',
          //   title: 'List',
          //   type: 'item',
          //   url: '/membership/list'
          // },
          // {
          //   id: 'price',
          //   title: 'Pricing',
          //   type: 'item',
          //   url: '/membership/price'
          // },
          // {
          //   id: 'setting',
          //   title: 'Setting',
          //   type: 'item',
          //   url: '/membership/setting'
          // }
        // ]
      },
      // {
      //   id: 'helpdesk',
      //   title: 'Helpdesk',
      //   type: 'collapse',
      //   icon: '#custom-24-support',
      //   role: [
      //     UserTypesEnum.Admin.toString(),
      //     UserTypesEnum.Manager.toString(),
      //     UserTypesEnum.BranchLeader.toString(),
      //     UserTypesEnum.Student.toString(),
      //     UserTypesEnum.Teacher.toString()
      //   ],
      //   children: [
      //     {
      //       id: 'dashboard',
      //       title: 'Dashboard',
      //       type: 'item',
      //       url: '/helpdesk/dashboard',
      //       role: [
      //         UserTypesEnum.Admin.toString(),
      //         UserTypesEnum.Manager.toString(),
      //         UserTypesEnum.BranchLeader.toString(),
      //         UserTypesEnum.Student.toString(),
      //         UserTypesEnum.Teacher.toString()
      //       ]
      //     },
      //     {
      //       id: 'ticket',
      //       title: 'Ticket',
      //       type: 'collapse',
      //       role: [
      //         UserTypesEnum.Admin.toString(),
      //         UserTypesEnum.Manager.toString(),
      //         UserTypesEnum.BranchLeader.toString(),
      //         UserTypesEnum.Student.toString(),
      //         UserTypesEnum.Teacher.toString()
      //       ],
      //       children: [
      //         {
      //           id: 'create',
      //           title: 'Create',
      //           type: 'item',
      //           url: '/helpdesk/ticket/create',
      //           role: [
      //             UserTypesEnum.Admin.toString(),
      //             UserTypesEnum.Manager.toString(),
      //             UserTypesEnum.BranchLeader.toString(),
      //             UserTypesEnum.Student.toString(),
      //             UserTypesEnum.Teacher.toString()
      //           ]
      //         },
      //         {
      //           id: 'list',
      //           title: 'List',
      //           type: 'item',
      //           url: '/helpdesk/ticket/list'
      //         },
      //         {
      //           id: 'details',
      //           title: 'Details',
      //           type: 'item',
      //           url: '/helpdesk/ticket/details'
      //         }
      //       ]
      //     },
      //     {
      //       id: 'customer',
      //       title: 'Customer',
      //       type: 'item',
      //       url: '/helpdesk/customer'
      //     }
      //   ]
      // },
      {
        id: 'invoice',
        title: 'Invoice',
         type: 'item',
            url: '/invoice/list',
        icon: '#custom-bill',
        role: [
          UserTypesEnum.Admin.toString(),
          UserTypesEnum.Manager.toString(),
          UserTypesEnum.BranchLeader.toString(),
          // UserTypesEnum.Student.toString(),
          // UserTypesEnum.Teacher.toString()
        ],
        // children: [
          // {
          //   id: 'dashboard',
          //   title: 'Dashboard',
          //   type: 'item',
          //   url: '/invoice/dashboard',
          //   role: [
          //     UserTypesEnum.Admin.toString(),
          //     UserTypesEnum.Manager.toString(),
          //     UserTypesEnum.BranchLeader.toString(),
          //     UserTypesEnum.Student.toString(),
          //     UserTypesEnum.Teacher.toString()
          //   ]
          // },
          // {
          //   id: 'create',
          //   title: 'Create',
          //   type: 'item',
          //   url: '/invoice/create'
          // },
          // {
          //   id: 'details',
          //   title: 'Details',
          //   type: 'item',
          //   url: '/invoice/details'
          // },
          // {
          //   id: 'list',
          //   title: 'List',
          //   type: 'item',
          //   url: '/invoice/list'
          // }
          // {
          //   id: 'edit',
          //   title: 'Edit',
          //   type: 'item',
          //   url: '/invoice/edit',
          //   role: [
          //     UserTypesEnum.Admin.toString(),
          //     UserTypesEnum.Manager.toString(),
          //     UserTypesEnum.BranchLeader.toString(),
          //     UserTypesEnum.Student.toString(),
          //     UserTypesEnum.Teacher.toString()
          //   ]
          // }
        // ]
      },
      {
        id: 'teacher-salary',
        title: 'Teacher Salary',
        type: 'item',
        icon: '#custom-dollar-square',
        url: '/teacher-salary',
        role: [
          UserTypesEnum.Admin.toString(),
          UserTypesEnum.Manager.toString(),
          UserTypesEnum.BranchLeader.toString(),
          // UserTypesEnum.Teacher.toString()
        ]
      }
    ]
  },
  // {
  //   id: 'application',
  //   title: 'Application',
  //   type: 'group',
  //   icon: 'icon-navigation',
  //   role: [
  //     UserTypesEnum.Admin.toString(),
  //     UserTypesEnum.Manager.toString(),
  //     UserTypesEnum.BranchLeader.toString(),
  //     UserTypesEnum.Student.toString(),
  //     UserTypesEnum.Teacher.toString()
  //   ],
  //   children: [
  //     {
  //       id: 'calender',
  //       title: 'Calender',
  //       type: 'item',
  //       classes: 'nav-item',
  //       url: '/application/calender',
  //       icon: '#custom-calendar-1'
  //     },
  //     {
  //       id: 'cht',
  //       title: 'Chat',
  //       type: 'item',
  //       classes: 'nav-item',
  //       url: '/application/chat',
  //       icon: '#custom-message-2'
  //     },
  //     {
  //       id: 'kanban',
  //       title: 'Kanban',
  //       type: 'item',
  //       classes: 'nav-item',
  //       url: '/application/kanban',
  //       icon: '#custom-kanban'
  //     },
  //     {
  //       id: 'customer',
  //       title: 'Customer',
  //       type: 'item',
  //       classes: 'nav-item',
  //       url: '/application/customer',
  //       icon: '#custom-notification-status'
  //     },
  //     {
  //       id: 'file-manager',
  //       title: 'File Manager',
  //       type: 'item',
  //       classes: 'nav-item',
  //       url: '/application/file-manager',
  //       icon: '#custom-document-filter'
  //     },
  //     {
  //       id: 'mail',
  //       title: 'Mail',
  //       type: 'item',
  //       classes: 'nav-item',
  //       url: '/application/email',
  //       icon: '#custom-direct-inbox',
  //       breadcrumbs: false
  //     },
  //     {
  //       id: 'profile',
  //       title: 'Profile',
  //       type: 'collapse',
  //       icon: '#custom-user-square',
  //       role: [
  //         UserTypesEnum.Admin.toString(),
  //         UserTypesEnum.Manager.toString(),
  //         UserTypesEnum.BranchLeader.toString(),
  //         UserTypesEnum.Student.toString(),
  //         UserTypesEnum.Teacher.toString()
  //       ],
  //       children: [
  //         {
  //           id: 'account',
  //           title: 'Account Profile',
  //           type: 'item',
  //           url: '/application/profile/account'
  //         },
  //         {
  //           id: 'social',
  //           title: 'Social Profile',
  //           type: 'item',
  //           url: '/application/profile/social'
  //         },
  //         {
  //           id: 'user',
  //           title: 'User Profile',
  //           type: 'item',
  //           url: '/application/profile/user'
  //         }
  //       ]
  //     },
  //     {
  //       id: 'e-commerce',
  //       title: 'E-commerce',
  //       type: 'collapse',
  //       icon: '#custom-shopping-bag',
  //       role: [
  //         UserTypesEnum.Admin.toString(),
  //         UserTypesEnum.Manager.toString(),
  //         UserTypesEnum.BranchLeader.toString(),
  //         UserTypesEnum.Student.toString(),
  //         UserTypesEnum.Teacher.toString()
  //       ],
  //       children: [
  //         {
  //           id: 'product',
  //           title: 'Product',
  //           type: 'item',
  //           url: '/application/e-commerce/product'
  //         },
  //         {
  //           id: 'product-details',
  //           title: 'Product Details',
  //           type: 'item',
  //           url: '/application/e-commerce/product-details/1'
  //         },
  //         {
  //           id: 'product-list',
  //           title: 'Product List',
  //           type: 'item',
  //           url: '/application/e-commerce/product-list'
  //         },
  //         {
  //           id: 'new-product',
  //           title: 'Add New Product',
  //           type: 'item',
  //           url: '/application/e-commerce/new-product',
  //           role: [
  //             UserTypesEnum.Admin.toString(),
  //             UserTypesEnum.Manager.toString(),
  //             UserTypesEnum.BranchLeader.toString(),
  //             UserTypesEnum.Student.toString(),
  //             UserTypesEnum.Teacher.toString()
  //           ]
  //         },
  //         {
  //           id: 'checkout',
  //           title: 'Checkout',
  //           type: 'item',
  //           url: '/application/e-commerce/checkout'
  //         }
  //       ]
  //     }
  //   ]
  // },
  // {
  //   id: 'forms',
  //   title: 'Forms',
  //   type: 'group',
  //   icon: 'icon-navigation',
  //   role: [
  //     UserTypesEnum.Admin.toString(),
  //     UserTypesEnum.Manager.toString(),
  //     UserTypesEnum.BranchLeader.toString(),
  //     UserTypesEnum.Student.toString(),
  //     UserTypesEnum.Teacher.toString()
  //   ],
  //   children: [
  //     {
  //       id: 'wizard',
  //       title: 'Form Wizard',
  //       type: 'item',
  //       classes: 'nav-item',
  //       url: '/forms/wizard',
  //       icon: '#custom-play'
  //     },
  //     {
  //       id: 'validation',
  //       title: 'Form Validation',
  //       type: 'item',
  //       classes: 'nav-item',
  //       url: '/forms/validation',
  //       icon: '#custom-password-check'
  //     },
  //     {
  //       id: 'layouts',
  //       title: 'Layouts',
  //       type: 'collapse',
  //       icon: '#custom-row-vertical',
  //       role: [
  //         UserTypesEnum.Admin.toString(),
  //         UserTypesEnum.Manager.toString(),
  //         UserTypesEnum.BranchLeader.toString(),
  //         UserTypesEnum.Student.toString(),
  //         UserTypesEnum.Teacher.toString()
  //       ],
  //       children: [
  //         {
  //           id: 'basic',
  //           title: 'Basic',
  //           type: 'item',
  //           url: '/forms/layout/basic-layout'
  //         },
  //         {
  //           id: 'multi-column',
  //           title: 'Multi Column',
  //           type: 'item',
  //           url: '/forms/layout/multi-layout'
  //         },
  //         {
  //           id: 'action-bar',
  //           title: 'Action Bar',
  //           type: 'item',
  //           url: '/forms/layout/action-bar'
  //         },
  //         {
  //           id: 'Sticky Bar',
  //           title: 'Sticky Action Bar',
  //           type: 'item',
  //           url: '/forms/layout/sticky-bar'
  //         }
  //       ]
  //     },
  //     {
  //       id: 'plugins',
  //       title: 'Plugins',
  //       type: 'collapse',
  //       icon: '#custom-cpu-charge',
  //       role: [
  //         UserTypesEnum.Admin.toString(),
  //         UserTypesEnum.Manager.toString(),
  //         UserTypesEnum.BranchLeader.toString(),
  //         UserTypesEnum.Student.toString(),
  //         UserTypesEnum.Teacher.toString()
  //       ],
  //       children: [
  //         {
  //           id: 'mask',
  //           title: 'Mask',
  //           type: 'item',
  //           url: '/forms/plugins/mask'
  //         },
  //         {
  //           id: 'reCaptcha',
  //           title: 'reCaptcha',
  //           type: 'item',
  //           url: '/forms/plugins/reCaptcha'
  //         },
  //         {
  //           id: 'clip-board',
  //           title: 'Clipboard',
  //           type: 'item',
  //           url: '/forms/plugins/clip-board'
  //         },
  //         {
  //           id: 'editor',
  //           title: 'Editor',
  //           type: 'item',
  //           url: '/forms/plugins/editor'
  //         },
  //         {
  //           id: 'drop-zone',
  //           title: 'Drop Zone',
  //           type: 'item',
  //           url: '/forms/plugins/drop-zone'
  //         }
  //       ]
  //     }
  //   ]
  // },
  // {
  //   id: 'table',
  //   title: 'Table',
  //   type: 'group',
  //   icon: 'icon-navigation',
  //   role: [
  //     UserTypesEnum.Admin.toString(),
  //     UserTypesEnum.Manager.toString(),
  //     UserTypesEnum.BranchLeader.toString(),
  //     UserTypesEnum.Student.toString(),
  //     UserTypesEnum.Teacher.toString()
  //   ],
  //   children: [
  //     {
  //       id: 'material table',
  //       title: 'Material Table',
  //       type: 'item',
  //       classes: 'nav-item',
  //       url: '/material-table',
  //       icon: '#custom-text-align-justify-center'
  //     },
  //     {
  //       id: 'ag-grid-tables',
  //       title: 'Ag Grid Table',
  //       type: 'collapse',
  //       icon: '#custom-docs',
  //       role: [
  //         UserTypesEnum.Admin.toString(),
  //         UserTypesEnum.Manager.toString(),
  //         UserTypesEnum.BranchLeader.toString(),
  //         UserTypesEnum.Student.toString(),
  //         UserTypesEnum.Teacher.toString()
  //       ],
  //       children: [
  //         {
  //           id: 'ag-grid-basic-table',
  //           title: 'Basic',
  //           type: 'item',
  //           url: '/ag-grid-table/basic'
  //         },
  //         {
  //           id: 'column-moving-table',
  //           title: 'Column Moving',
  //           type: 'item',
  //           url: '/ag-grid-table/column-moving'
  //         },
  //         {
  //           id: 'row-pagination-table',
  //           title: 'Row Pagination',
  //           type: 'item',
  //           url: '/ag-grid-table/row-pagination'
  //         },
  //         {
  //           id: 'highlight-change-table',
  //           title: 'Highlight Change',
  //           type: 'item',
  //           url: '/ag-grid-table/highlight-change'
  //         },
  //         {
  //           id: 'column-filter-table',
  //           title: 'Column Filter',
  //           type: 'item',
  //           url: '/ag-grid-table/column-filter'
  //         }
  //       ]
  //     }
  //   ]
  // },
  // {
  //   id: 'chart',
  //   title: 'Charts',
  //   type: 'group',
  //   icon: 'icon-navigation',
  //   role: [
  //     UserTypesEnum.Admin.toString(),
  //     UserTypesEnum.Manager.toString(),
  //     UserTypesEnum.BranchLeader.toString(),
  //     UserTypesEnum.Student.toString(),
  //     UserTypesEnum.Teacher.toString()
  //   ],
  //   children: [
  //     {
  //       id: 'apex-charts',
  //       title: 'Apex Chart',
  //       type: 'item',
  //       classes: 'nav-item',
  //       url: '/apex-chart',
  //       icon: '#custom-graph'
  //     }
  //   ]
  // },
  // {
  //   id: 'pages',
  //   title: 'Pages',
  //   type: 'group',
  //   icon: 'icon-navigation',
  //   role: [
  //     UserTypesEnum.Admin.toString(),
  //     UserTypesEnum.Manager.toString(),
  //     UserTypesEnum.BranchLeader.toString(),
  //     UserTypesEnum.Student.toString(),
  //     UserTypesEnum.Teacher.toString()
  //   ],
  //   children: [
  //     {
  //       id: 'authentication',
  //       title: 'Authentication',
  //       type: 'collapse',
  //       icon: '#custom-shield',
  //       role: [
  //         UserTypesEnum.Admin.toString(),
  //         UserTypesEnum.Manager.toString(),
  //         UserTypesEnum.BranchLeader.toString(),
  //         UserTypesEnum.Student.toString(),
  //         UserTypesEnum.Teacher.toString()
  //       ],
  //       children: [
  //         {
  //           id: 'authentication-1',
  //           title: 'Authentication 1',
  //           type: 'collapse',
  //           role: [
  //             UserTypesEnum.Admin.toString(),
  //             UserTypesEnum.Manager.toString(),
  //             UserTypesEnum.BranchLeader.toString(),
  //             UserTypesEnum.Student.toString(),
  //             UserTypesEnum.Teacher.toString()
  //           ],
  //           children: [
  //             {
  //               id: 'login',
  //               title: 'Login',
  //               type: 'item',
  //               url: '/authentication-1/login',
  //               target: true,
  //               breadcrumbs: false
  //             },
  //             {
  //               id: 'register',
  //               title: 'Register',
  //               type: 'item',
  //               url: '/authentication-1/register',
  //               target: true,
  //               breadcrumbs: false
  //             },
  //             {
  //               id: 'forgot',
  //               title: 'Forgot Password',
  //               type: 'item',
  //               url: '/authentication-1/forgot-password',
  //               target: true,
  //               breadcrumbs: false
  //             },
  //             {
  //               id: 'reset',
  //               title: 'Reset Password',
  //               type: 'item',
  //               url: '/authentication-1/reset-password',
  //               target: true,
  //               breadcrumbs: false
  //             },
  //             {
  //               id: 'check-mail',
  //               title: 'Check Mail',
  //               type: 'item',
  //               url: '/authentication-1/check-mail',
  //               target: true,
  //               breadcrumbs: false
  //             },
  //             {
  //               id: 'code-verify',
  //               title: 'Code Verification',
  //               type: 'item',
  //               url: '/authentication-1/code-verify',
  //               target: true,
  //               breadcrumbs: false
  //             }
  //           ]
  //         },
  //         {
  //           id: 'authentication-2',
  //           title: 'Authentication 2',
  //           type: 'collapse',
  //           role: [
  //             UserTypesEnum.Admin.toString(),
  //             UserTypesEnum.Manager.toString(),
  //             UserTypesEnum.BranchLeader.toString(),
  //             UserTypesEnum.Student.toString(),
  //             UserTypesEnum.Teacher.toString()
  //           ],
  //           children: [
  //             {
  //               id: 'login',
  //               title: 'Login',
  //               type: 'item',
  //               url: '/authentication-2/login',
  //               target: true,
  //               breadcrumbs: false
  //             },
  //             {
  //               id: 'register',
  //               title: 'Register',
  //               type: 'item',
  //               url: '/authentication-2/register',
  //               target: true,
  //               breadcrumbs: false
  //             },
  //             {
  //               id: 'forgot',
  //               title: 'Forgot Password',
  //               type: 'item',
  //               url: '/authentication-2/forgot-password',
  //               target: true,
  //               breadcrumbs: false
  //             },
  //             {
  //               id: 'reset',
  //               title: 'Reset Password',
  //               type: 'item',
  //               url: '/authentication-2/reset-password',
  //               target: true,
  //               breadcrumbs: false
  //             },
  //             {
  //               id: 'check-mail',
  //               title: 'Check Mail',
  //               type: 'item',
  //               url: '/authentication-2/check-mail',
  //               target: true,
  //               breadcrumbs: false
  //             },
  //             {
  //               id: 'code-verify',
  //               title: 'Code Verification',
  //               type: 'item',
  //               url: '/authentication-2/code-verify',
  //               target: true,
  //               breadcrumbs: false
  //             }
  //           ]
  //         },
  //         {
  //           id: 'authentication-3',
  //           title: 'Authentication 3',
  //           type: 'item',
  //           classes: 'nav-item',
  //           url: '/authentication-3',
  //           target: true,
  //           breadcrumbs: false,
  //           role: [
  //             UserTypesEnum.Admin.toString(),
  //             UserTypesEnum.Manager.toString(),
  //             UserTypesEnum.BranchLeader.toString(),
  //             UserTypesEnum.Student.toString(),
  //             UserTypesEnum.Teacher.toString()
  //           ]
  //         }
  //       ]
  //     },
  //     {
  //       id: 'maintenance',
  //       title: 'Maintenance',
  //       type: 'collapse',
  //       icon: '#custom-flag',
  //       role: [
  //         UserTypesEnum.Admin.toString(),
  //         UserTypesEnum.Manager.toString(),
  //         UserTypesEnum.BranchLeader.toString(),
  //         UserTypesEnum.Student.toString(),
  //         UserTypesEnum.Teacher.toString()
  //       ],
  //       children: [
  //         {
  //           id: 'error',
  //           title: 'Error 404',
  //           type: 'item',
  //           url: '/maintenance/error-404',
  //           target: true,
  //           breadcrumbs: false
  //         },
  //         {
  //           id: 'error-500',
  //           title: 'Error 500',
  //           type: 'item',
  //           url: '/maintenance/error-500',
  //           target: true,
  //           breadcrumbs: false
  //         },
  //         {
  //           id: 'under-constructor',
  //           title: 'Under Construction',
  //           type: 'item',
  //           url: '/maintenance/under-constructor',
  //           target: true,
  //           breadcrumbs: false
  //         },
  //         {
  //           id: 'coming-soon',
  //           title: 'Coming Soon',
  //           type: 'item',
  //           url: '/maintenance/coming-soon',
  //           target: true,
  //           breadcrumbs: false
  //         }
  //       ]
  //     },
  //     {
  //       id: 'contact-us',
  //       title: 'Contact Us',
  //       type: 'item',
  //       classes: 'nav-item',
  //       url: '/contact-us',
  //       icon: '#custom-24-support',
  //       role: [
  //         UserTypesEnum.Admin.toString(),
  //         UserTypesEnum.Manager.toString(),
  //         UserTypesEnum.BranchLeader.toString(),
  //         UserTypesEnum.Student.toString(),
  //         UserTypesEnum.Teacher.toString()
  //       ],
  //       target: true,
  //       breadcrumbs: false
  //     },
  //     {
  //       id: 'price',
  //       title: 'Price',
  //       type: 'collapse',
  //       icon: '#custom-dollar-square',
  //       role: [
  //         UserTypesEnum.Admin.toString(),
  //         UserTypesEnum.Manager.toString(),
  //         UserTypesEnum.BranchLeader.toString(),
  //         UserTypesEnum.Student.toString(),
  //         UserTypesEnum.Teacher.toString()
  //       ],
  //       children: [
  //         {
  //           id: 'price-1',
  //           title: 'Price 1',
  //           type: 'item',
  //           url: '/price/price-1'
  //         },
  //         {
  //           id: 'price-2',
  //           title: 'Price 2',
  //           type: 'item',
  //           url: '/price/price-2'
  //         }
  //       ]
  //     },
  //     {
  //       id: 'landing',
  //       title: 'Landing',
  //       type: 'item',
  //       classes: 'nav-item',
  //       url: '/landing',
  //       icon: '#custom-airplane',
  //       role: [
  //         UserTypesEnum.Admin.toString(),
  //         UserTypesEnum.Manager.toString(),
  //         UserTypesEnum.BranchLeader.toString(),
  //         UserTypesEnum.Student.toString(),
  //         UserTypesEnum.Teacher.toString()
  //       ],
  //       target: true,
  //       breadcrumbs: false
  //     }
  //   ]
  // },
  // {
  //   id: 'other',
  //   title: 'Other',
  //   type: 'group',
  //   icon: 'icon-navigation',
  //   role: [
  //     UserTypesEnum.Admin.toString(),
  //     UserTypesEnum.Manager.toString(),
  //     UserTypesEnum.BranchLeader.toString(),
  //     UserTypesEnum.Student.toString(),
  //     UserTypesEnum.Teacher.toString()
  //   ],
  //   children: [
  //     {
  //       id: 'menu-levels',
  //       title: 'Menu levels',
  //       type: 'collapse',
  //       icon: '#custom-level',
  //       role: [
  //         UserTypesEnum.Admin.toString(),
  //         UserTypesEnum.Manager.toString(),
  //         UserTypesEnum.BranchLeader.toString(),
  //         UserTypesEnum.Student.toString(),
  //         UserTypesEnum.Teacher.toString()
  //       ],
  //       children: [
  //         {
  //           id: 'level-2-1',
  //           title: 'Level 2.1',
  //           type: 'item',
  //           url: 'javascript:',
  //           external: true
  //         },
  //         {
  //           id: 'menu-level-2.2',
  //           title: 'Menu Level 2.2',
  //           type: 'collapse',
  //           classes: 'edge',
  //           role: [
  //             UserTypesEnum.Admin.toString(),
  //             UserTypesEnum.Manager.toString(),
  //             UserTypesEnum.BranchLeader.toString(),
  //             UserTypesEnum.Student.toString(),
  //             UserTypesEnum.Teacher.toString()
  //           ],
  //           children: [
  //             {
  //               id: 'menu-level-3.1',
  //               title: 'Menu Level 3.1',
  //               type: 'item',
  //               url: 'javascript:',
  //               external: true
  //             },
  //             {
  //               id: 'menu-level-3.2',
  //               title: 'Menu Level 3.2',
  //               type: 'item',
  //               url: 'javascript:',
  //               external: true
  //             },
  //             {
  //               id: 'menu-level-3.3',
  //               title: 'Menu Level 3.3',
  //               type: 'collapse',
  //               classes: 'edge',
  //               role: [
  //                 UserTypesEnum.Admin.toString(),
  //                 UserTypesEnum.Manager.toString(),
  //                 UserTypesEnum.BranchLeader.toString(),
  //                 UserTypesEnum.Student.toString(),
  //                 UserTypesEnum.Teacher.toString()
  //               ],
  //               children: [
  //                 {
  //                   id: 'menu-level-4.1',
  //                   title: 'Menu Level 4.1',
  //                   type: 'item',
  //                   url: 'javascript:',
  //                   external: true
  //                 },
  //                 {
  //                   id: 'menu-level-4.2',
  //                   title: 'Menu Level 4.2',
  //                   type: 'item',
  //                   url: 'javascript:',
  //                   external: true
  //                 }
  //               ]
  //             }
  //           ]
  //         },
  //         {
  //           id: 'menu-level-2.3',
  //           title: 'Menu Level 2.3',
  //           type: 'collapse',
  //           classes: 'edge',
  //           role: [
  //             UserTypesEnum.Admin.toString(),
  //             UserTypesEnum.Manager.toString(),
  //             UserTypesEnum.BranchLeader.toString(),
  //             UserTypesEnum.Student.toString(),
  //             UserTypesEnum.Teacher.toString()
  //           ],
  //           children: [
  //             {
  //               id: 'menu-level-3.1',
  //               title: 'Menu Level 3.1',
  //               type: 'item',
  //               url: 'javascript:',
  //               external: true
  //             },
  //             {
  //               id: 'menu-level-3.2',
  //               title: 'Menu Level 3.2',
  //               type: 'item',
  //               url: 'javascript:',
  //               external: true
  //             },
  //             {
  //               id: 'menu-level-3.3',
  //               title: 'Menu Level 3.3',
  //               type: 'collapse',
  //               classes: 'edge',
  //               role: [
  //                 UserTypesEnum.Admin.toString(),
  //                 UserTypesEnum.Manager.toString(),
  //                 UserTypesEnum.BranchLeader.toString(),
  //                 UserTypesEnum.Student.toString(),
  //                 UserTypesEnum.Teacher.toString()
  //               ],
  //               children: [
  //                 {
  //                   id: 'menu-level-4.1',
  //                   title: 'Menu Level 4.1',
  //                   type: 'item',
  //                   url: 'javascript:',
  //                   external: true
  //                 },
  //                 {
  //                   id: 'menu-level-4.2',
  //                   title: 'Menu Level 4.2',
  //                   type: 'item',
  //                   url: 'javascript:',
  //                   external: true
  //                 }
  //               ]
  //             }
  //           ]
  //         }
  //       ]
  //     },
  //     {
  //       id: 'sample-page',
  //       title: 'Sample Page',
  //       type: 'item',
  //       classes: 'nav-item',
  //       url: '/sample-page',
  //       icon: '#custom-notification-status',
  //       role: [
  //         UserTypesEnum.Admin.toString(),
  //         UserTypesEnum.Manager.toString(),
  //         UserTypesEnum.BranchLeader.toString(),
  //         UserTypesEnum.Student.toString(),
  //         UserTypesEnum.Teacher.toString()
  //       ]
  //     },
  //     {
  //       id: 'document',
  //       title: 'Document',
  //       type: 'item',
  //       classes: 'nav-item',
  //       url: 'https://phoenixcoded.gitbook.io/able-pro',
  //       icon: '#custom-gitBook',
  //       target: true,
  //       external: true,
  //       role: [
  //         UserTypesEnum.Admin.toString(),
  //         UserTypesEnum.Manager.toString(),
  //         UserTypesEnum.BranchLeader.toString(),
  //         UserTypesEnum.Student.toString(),
  //         UserTypesEnum.Teacher.toString()
  //       ]
  //     }
  //   ]
  // }
];