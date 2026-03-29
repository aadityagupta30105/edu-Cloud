import axios from 'axios';

const API = axios.create({
  baseURL: process.env.REACT_APP_API_URL || 'http://localhost:5000/api',
  withCredentials: true,
});

API.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

API.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(err);
  }
);

export const authAPI = {
  register:      (data) => API.post('/auth/register', data),
  login:         (data) => API.post('/auth/login', data),
  getMe:         ()     => API.get('/auth/me'),
  updateProfile: (data) => API.put('/auth/profile', data),
};

export const coursesAPI = {
  getAll:         (params) => API.get('/courses', { params }),
  getOne:         (id)     => API.get(`/courses/${id}`),
  create:         (data)   => API.post('/courses', data),
  update:         (id, d)  => API.put(`/courses/${id}`, d),
  delete:         (id)     => API.delete(`/courses/${id}`),
  addLesson:      (id, fd) => API.post(`/courses/${id}/lessons`, fd),
  deleteLesson:   (id, lid)=> API.delete(`/courses/${id}/lessons/${lid}`),
  enroll:         (id)     => API.post(`/courses/${id}/enroll`),
  unenroll:       (id)     => API.post(`/courses/${id}/unenroll`),
  updateProgress: (id, d)  => API.put(`/courses/${id}/progress`, d),
};

export const assignmentsAPI = {
  getByCourse: (courseId)        => API.get(`/assignments/course/${courseId}`),
  getOne:      (id)              => API.get(`/assignments/${id}`),
  create:      (data)            => API.post('/assignments', data),
  update:      (id, d)           => API.put(`/assignments/${id}`, d),
  delete:      (id)              => API.delete(`/assignments/${id}`),
  submit:      (id, data)        => API.post(`/assignments/${id}/submit`, data),
  grade:       (id, studentId, d)=> API.put(`/assignments/${id}/grade/${studentId}`, d),
};

export const quizzesAPI = {
  getByCourse:   (courseId) => API.get(`/quizzes/course/${courseId}`),
  getSubmissions:(id)       => API.get(`/quizzes/${id}/submissions`),
  getMyResult:   (id)       => API.get(`/quizzes/${id}/my-result`),
  create:        (data)     => API.post('/quizzes', data),
  update:        (id, d)    => API.put(`/quizzes/${id}`, d),
  delete:        (id)       => API.delete(`/quizzes/${id}`),
  submit:        (id, data) => API.post(`/quizzes/${id}/submit`, data),
};

export const aiAPI = {
  status:           ()     => API.get('/ai/status'),
  chat:             (data) => API.post('/ai/chat', data),
  generateQuizText: (data) => API.post('/ai/generate-quiz-text', data),
  generateQuiz:     (fd)   => API.post('/ai/generate-quiz', fd, { headers: { 'Content-Type': 'multipart/form-data' } }),
  summarize:        (data) => data instanceof FormData
    ? API.post('/ai/summarize', data, { headers: { 'Content-Type': 'multipart/form-data' } })
    : API.post('/ai/summarize', data),
};

export const announcementsAPI = {
  getAll:  (params) => API.get('/announcements', { params }),
  create:  (data)   => API.post('/announcements', data),
  delete:  (id)     => API.delete(`/announcements/${id}`),
};

export const usersAPI = {
  getAll:          (params)            => API.get('/users', { params }),
  create:          (data)              => API.post('/users', data),
  update:          (id, d)             => API.put(`/users/${id}`, d),
  delete:          (id)                => API.delete(`/users/${id}`),
  enrollStudent:   (studentId, courseId) => API.post('/users/enroll',          { studentId, courseId }),
  unenrollStudent: (studentId, courseId) => API.post('/users/unenroll',        { studentId, courseId }),
  assignTeacher:   (teacherId, courseId) => API.post('/users/assign-teacher',  { teacherId, courseId }),
};

export const analyticsAPI = {
  overview: () => API.get('/analytics/overview'),
  teacher:  () => API.get('/analytics/teacher'),
  student:  () => API.get('/analytics/student'),
};

export const liveAPI = {
  start:     (courseId, data) => API.post(`/live/${courseId}/start`, data),
  end:       (courseId)       => API.post(`/live/${courseId}/end`),
  getStatus: (courseId)       => API.get(`/live/${courseId}/status`),
};

export const resourcesAPI = {
  upload: (fd) => API.post('/resources/upload', fd, { headers: { 'Content-Type': 'multipart/form-data' } }),
};

export default API;