import React, { useState, useEffect } from 'react';
import { 
  Form, 
  Input, 
  Button, 
  Card, 
  Space, 
  message, 
  Steps,
  Divider,
  Modal,
  Result
} from 'antd';
import { 
  UserOutlined, 
  EditOutlined, 
  CheckOutlined,
  SaveOutlined,
  SendOutlined
} from '@ant-design/icons';
import { SurveyService } from '../services/surveyService';

const { TextArea } = Input;
const { Step } = Steps;

const SurveyForm = () => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [template, setTemplate] = useState(null);
  const [employee, setEmployee] = useState(null);
  const [currentStep, setCurrentStep] = useState(0);
  const [savedResponseId, setSavedResponseId] = useState(null);
  const [isSubmitted, setIsSubmitted] = useState(false);

  useEffect(() => {
    loadTemplate();
  }, []);

  const loadTemplate = async () => {
    try {
      const templateData = await SurveyService.getTemplate();
      setTemplate(templateData);
    } catch (error) {
      message.error('加载问卷模板失败');
      console.error('Error loading template:', error);
    }
  };

  const validateEmployee = async (employeeNumber) => {
    if (!employeeNumber) return false;
    
    try {
      const employeeData = await SurveyService.getEmployeeByNumber(employeeNumber);
      if (employeeData) {
        setEmployee(employeeData);
        form.setFieldsValue({
          employee_name: employeeData.name,
          department: employeeData.department,
          position: employeeData.position
        });
        return true;
      } else {
        message.warning('未找到该工号对应的员工信息');
        return false;
      }
    } catch (error) {
      console.error('Error validating employee:', error);
      return false;
    }
  };

  const handleNext = async () => {
    try {
      if (currentStep === 0) {
        // 验证基本信息
        const values = await form.validateFields(['employee_number', 'employee_name']);
        const isValid = await validateEmployee(values.employee_number);
        if (!isValid) return;
      }
      
      setCurrentStep(currentStep + 1);
    } catch (error) {
      console.error('Validation failed:', error);
    }
  };

  const handlePrev = () => {
    setCurrentStep(currentStep - 1);
  };

  const saveDraft = async () => {
    try {
      setLoading(true);
      const values = form.getFieldsValue();
      
      const responseData = {
        template_id: template?.id || null,
        employee_id: employee?.id || null,
        employee_number: values.employee_number,
        employee_name: values.employee_name || employee?.name || '未知员工',
        performance_feedback: values.performance_feedback,
        role_recognition: values.role_recognition,
        support_needs: values.support_needs,
        next_phase_plan: values.next_phase_plan,
        efficiency_feedback: values.efficiency_feedback,
        summary: values.summary
      };

      let response;
      if (savedResponseId) {
        response = await SurveyService.saveDraft(savedResponseId, responseData);
      } else {
        response = await SurveyService.createSurveyResponse(responseData);
        setSavedResponseId(response.id);
      }

      message.success('草稿保存成功');
    } catch (error) {
      message.error('保存草稿失败');
      console.error('Error saving draft:', error);
    } finally {
      setLoading(false);
    }
  };

  const submitSurvey = async () => {
    try {
      setLoading(true);
      await form.validateFields();
      const values = form.getFieldsValue();

      const responseData = {
        template_id: template?.id || null,
        employee_id: employee?.id || null,
        employee_number: values.employee_number,
        employee_name: values.employee_name || employee?.name || '未知员工',
        performance_feedback: values.performance_feedback,
        role_recognition: values.role_recognition,
        support_needs: values.support_needs,
        next_phase_plan: values.next_phase_plan,
        efficiency_feedback: values.efficiency_feedback,
        summary: values.summary
      };


      let response;
      if (savedResponseId) {
        response = await SurveyService.submitSurveyResponse(savedResponseId, responseData);
      } else {
        const draftResponse = await SurveyService.createSurveyResponse(responseData);
        response = await SurveyService.submitSurveyResponse(draftResponse.id, responseData);
      }

      setIsSubmitted(true);
      message.success('问卷提交成功！');
    } catch (error) {
      message.error('提交失败，请重试');
      console.error('Error submitting survey:', error);
    } finally {
      setLoading(false);
    }
  };

  const confirmSubmit = () => {
    Modal.confirm({
      title: '确认提交问卷',
      content: '提交后将无法修改，确定要提交吗？',
      okText: '确定提交',
      cancelText: '取消',
      onOk: submitSurvey
    });
  };

  if (isSubmitted) {
    return (
      <Result
        status="success"
        title="问卷提交成功！"
        subTitle="感谢您的参与，您的反馈对我们很重要。"
        extra={[
          <Button type="primary" key="new" onClick={() => window.location.reload()}>
            填写新问卷
          </Button>
        ]}
      />
    );
  }

  if (!template) {
    return <div>加载中...</div>;
  }

  const steps = [
    {
      title: '基本信息',
      icon: <UserOutlined />
    },
    {
      title: '问卷内容',
      icon: <EditOutlined />
    },
    {
      title: '确认提交',
      icon: <CheckOutlined />
    }
  ];

  const renderStepContent = () => {
    switch (currentStep) {
      case 0:
        return (
          <Card title="基本信息" style={{ marginTop: 16 }}>
            <Form.Item
              name="employee_number"
              label="工号"
              rules={[{ required: true, message: '请输入工号' }]}
            >
              <Input 
                placeholder="请输入您的工号" 
                onBlur={(e) => validateEmployee(e.target.value)}
              />
            </Form.Item>
            
            <Form.Item
              name="employee_name"
              label="姓名"
              rules={[{ required: true, message: '请输入姓名' }]}
            >
              <Input placeholder="请输入您的姓名" />
            </Form.Item>
            
            <Form.Item name="department" label="部门">
              <Input placeholder="部门信息（自动填充）" disabled />
            </Form.Item>
            
            <Form.Item name="position" label="职位">
              <Input placeholder="职位信息（自动填充）" disabled />
            </Form.Item>
          </Card>
        );

      case 1:
        return (
          <div style={{ marginTop: 16 }}>
            {template.questions.sections.map((section, index) => (
              <Card key={index} title={section.title} style={{ marginBottom: 16 }}>
                <p style={{ color: '#666', marginBottom: 16 }}>{section.description}</p>
                <Form.Item
                  name={section.field}
                  rules={section.required ? [{ required: true, message: `请填写${section.title}` }] : []}
                >
                  <TextArea
                    rows={4}
                    placeholder={`请输入${section.title}相关内容...`}
                  />
                </Form.Item>
              </Card>
            ))}
          </div>
        );

      case 2:
        const values = form.getFieldsValue();
        return (
          <Card title="确认提交" style={{ marginTop: 16 }}>
            <div style={{ marginBottom: 16 }}>
              <h4>基本信息</h4>
              <p><strong>工号：</strong>{values.employee_number}</p>
              <p><strong>姓名：</strong>{values.employee_name}</p>
              <p><strong>部门：</strong>{values.department}</p>
              <p><strong>职位：</strong>{values.position}</p>
            </div>
            
            <Divider />
            
            <div>
              <h4>问卷内容</h4>
              {template.questions.sections.map((section, index) => (
                <div key={index} style={{ marginBottom: 16 }}>
                  <p><strong>{section.title}：</strong></p>
                  <p style={{ 
                    background: '#f5f5f5', 
                    padding: '8px 12px', 
                    borderRadius: '4px',
                    whiteSpace: 'pre-wrap'
                  }}>
                    {values[section.field] || '（未填写）'}
                  </p>
                </div>
              ))}
            </div>
          </Card>
        );

      default:
        return null;
    }
  };

  return (
    <div style={{ maxWidth: 800, margin: '0 auto', padding: '24px' }}>
      <Card>
        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <h1>绩效问卷</h1>
          <p style={{ color: '#666' }}>请认真填写以下内容，您的反馈对我们很重要</p>
        </div>

        <Steps current={currentStep} items={steps} />

        <Form
          form={form}
          layout="vertical"
          onFinish={submitSurvey}
        >
          {/* 所有表单项都要在DOM中，只是通过CSS控制显示/隐藏 */}
          <div style={{ display: currentStep === 0 ? 'block' : 'none' }}>
            <Card title="基本信息" style={{ marginTop: 16 }}>
              <Form.Item
                name="employee_number"
                label="工号"
                rules={[{ required: true, message: '请输入工号' }]}
              >
                <Input 
                  placeholder="请输入您的工号" 
                  onBlur={(e) => validateEmployee(e.target.value)}
                />
              </Form.Item>
              
              <Form.Item
                name="employee_name"
                label="姓名"
                rules={[{ required: true, message: '请输入姓名' }]}
              >
                <Input placeholder="请输入您的姓名" />
              </Form.Item>
              
              <Form.Item name="department" label="部门">
                <Input placeholder="部门信息（自动填充）" disabled />
              </Form.Item>
              
              <Form.Item name="position" label="职位">
                <Input placeholder="职位信息（自动填充）" disabled />
              </Form.Item>
            </Card>
          </div>

          <div style={{ display: currentStep === 1 ? 'block' : 'none' }}>
            <div style={{ marginTop: 16 }}>
              {template && template.questions.sections.map((section, index) => (
                <Card key={index} title={section.title} style={{ marginBottom: 16 }}>
                  <p style={{ color: '#666', marginBottom: 16 }}>{section.description}</p>
                  <Form.Item
                    name={section.field}
                    rules={section.required ? [{ required: true, message: `请填写${section.title}` }] : []}
                  >
                    <TextArea
                      rows={4}
                      placeholder={`请输入${section.title}相关内容...`}
                    />
                  </Form.Item>
                </Card>
              ))}
            </div>
          </div>

          <div style={{ display: currentStep === 2 ? 'block' : 'none' }}>
            {currentStep === 2 && renderStepContent()}
          </div>

          <div style={{ marginTop: 24, textAlign: 'center' }}>
            <Space>
              {currentStep > 0 && (
                <Button onClick={handlePrev}>
                  上一步
                </Button>
              )}
              
              {currentStep < steps.length - 1 && (
                <Button type="primary" onClick={handleNext}>
                  下一步
                </Button>
              )}
              
              {currentStep === steps.length - 1 && (
                <>
                  <Button 
                    icon={<SaveOutlined />} 
                    onClick={saveDraft}
                    loading={loading}
                  >
                    保存草稿
                  </Button>
                  <Button 
                    type="primary" 
                    icon={<SendOutlined />}
                    onClick={confirmSubmit}
                    loading={loading}
                  >
                    提交问卷
                  </Button>
                </>
              )}
            </Space>
          </div>
        </Form>
      </Card>
    </div>
  );
};

export default SurveyForm;